/**
 * The LLM never reads the DOM: it gets this structured snapshot of what the user is looking at
 * (route, focused node, visible nodes, block descriptions, live variables, progress, sources).
 */
import type { ContentGraph, ContentNode, Course, Evaluation } from "@/core/content";
import { walkBlocks } from "@/core/content/build";
import { blockRegistry, kindLabel } from "@/core/registry";
import { evaluationTree, progress, status, toPNode, type Flags } from "@/core/progress";
import type { VarValue } from "@/core/content/schemas";

export interface ContextInput {
  graph: ContentGraph;
  path: string;
  selected: string | null;
  visible: Record<string, number>;
  vars: Record<string, VarValue>;
  done: Flags;
  today: string;
}

export interface ContextSnapshot {
  /** the node "this" refers to */
  focus: ContentNode | null;
  text: string;
}

const route = (path: string) => {
  const m = /^\/s\/([^/]+)(?:\/c\/([^/]+))?(?:\/e\/([^/]+))?/.exec(path);
  return { semester: m?.[1], course: m?.[2], evaluation: m?.[3] };
};

function describeNode(n: ContentNode, vars: Record<string, VarValue>, course: Course, language: string, done: Flags): string {
  const lines: string[] = [];
  const st = status(toPNode(n), done);
  lines.push(`### ${kindLabel(n.kind, language)}: ${n.title ?? ""} (id: ${n.id}, ${st === "done" ? "learned" : st === "partial" ? "partly learned" : "not learned yet"})`);
  walkBlocks(n, (type, props) => {
    const def = blockRegistry.get(type);
    if (def) lines.push(`- ${def.describe(props, { vars })}`);
  });
  if (n.sources.length)
    lines.push(`Sources: ${n.sources.map((s) => `${(s.ref && course.sources.get(s.ref)?.title) || s.ref || "generated"}${s.page ? ` p.${s.page}` : s.locator ? ` ${s.locator}` : ""} [${s.basis}]`).join("; ")}`);
  if (n.relations.length) lines.push(`Relations: ${n.relations.map((r) => `${r.type} → ${r.target}`).join(", ")}`);
  if (n.children.length) lines.push(`Children: ${n.children.map((c) => `${c.id} (${c.kind})`).join(", ")}`);
  return lines.join("\n");
}

export function buildContext(input: ContextInput): ContextSnapshot {
  const { graph, done } = input;
  const r = route(input.path);
  const out: string[] = [`Today: ${input.today}`];
  const course: Course | undefined = r.course ? graph.courses.get(`${r.semester}/${r.course}`) : undefined;
  const ev: Evaluation | undefined = r.evaluation ? graph.evaluations.get(`${r.semester}/${r.course}/${r.evaluation}`) : undefined;
  if (!course) {
    out.push(`Screen: ${r.semester ? `semester ${r.semester}` : "home (calendar + next priority)"}`);
    const courses = r.semester ? graph.semesters.find((s) => s.id === r.semester)?.courses ?? [] : [...graph.courses.values()];
    out.push(
      `Courses: ${courses.map((c) => `${c.data.name} (${c.evaluations.map((e) => `${e.meta.title}${e.meta.date ? ` on ${e.meta.date}` : ""}`).join(", ")})`).join("; ")}`,
    );
    return { focus: null, text: out.join("\n") };
  }
  const lang = course.data.language;
  out.push(`Course: ${course.data.name}${course.data.code ? ` (${course.data.code})` : ""}, language: ${lang}`);
  if (!ev?.content) {
    out.push(`Screen: course page. Evaluations: ${course.evaluations.map((e) => `${e.meta.title} [${e.meta.kind}]${e.meta.date ? ` ${e.meta.date}` : ""}${e.meta.scope ? ` scope: ${e.meta.scope}` : ""}`).join("; ")}`);
    if (course.data.promotion) out.push(`Promotion rules: ${course.data.promotion}`);
    return { focus: null, text: out.join("\n") };
  }
  const tree = evaluationTree(ev)!;
  out.push(`Screen: study page for ${ev.meta.title}${ev.meta.date ? ` (date ${ev.meta.date})` : ""}, overall progress ${Math.round(progress(tree, done) * 100)}%`);
  out.push(`Topics: ${ev.content.topics.map((t) => `${t.title} [${t.id}] ${Math.round(progress(toPNode(t), done) * 100)}%`).join("; ")}`);

  const visibleIds = Object.entries(input.visible)
    .filter(([id]) => graph.nodes.get(id)?.evaluationKey === ev.key)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
  // "this" = the selected node, else the most visible non-container leaf-ish node
  const focusId =
    (input.selected && graph.nodes.has(input.selected) ? input.selected : null) ??
    visibleIds.find((id) => !graph.nodes.get(id)!.node.container) ??
    visibleIds[0] ??
    null;
  const focus = focusId ? graph.nodes.get(focusId)!.node : null;
  if (focus) out.push(`\n## "This" (what the user is asking about)\n${describeNode(focus, input.vars, course, lang, done)}`);
  const others = visibleIds.filter((id) => id !== focusId && !graph.nodes.get(id)!.node.container).slice(0, 6);
  if (others.length) out.push(`\n## Also on screen\n${others.map((id) => describeNode(graph.nodes.get(id)!.node, input.vars, course, lang, done)).join("\n\n")}`);
  const varEntries = Object.entries(input.vars);
  if (varEntries.length) out.push(`\n## Page variables (live)\n${varEntries.map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join(", ")}`);
  return { focus, text: out.join("\n") };
}

export function systemPrompt(context: string, language: string): string {
  return [
    "You are Corta's study tutor, inside Alejo's personal study app. He is studying a university course and asks about what he sees on screen.",
    `Answer in the course language (${language === "es" ? "Spanish, rioplatense voseo is welcome" : language}). Be concise and clear; use analogies when they help.`,
    "Stay faithful to the teaching staff: use their terminology and notation exactly as in the context. Say so when something goes beyond the course material.",
    "Math: write LaTeX with $…$ inline and $$…$$ on its own line for tall formulas.",
    "\"This\" / \"esto\" means the node under \"This\" below. You can act on the page with the tools (navigate to a node, set a page variable, open hidden proofs/solutions); use them when it helps, then explain.",
    "If he asks for an exercise's solution, prefer hints first unless he explicitly wants the full solution.",
    "\n# Current screen\n" + context,
  ].join("\n");
}
