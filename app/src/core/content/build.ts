/**
 * Content loader core (pure, framework-free): raw files in → validated, normalized ID graph out.
 * The Vite adapter (`source.ts`) and the Node scripts both feed it a { path → text } map.
 * Every problem becomes a readable ContentIssue (file, path, message, hint); nothing throws.
 */
import { parse as parseYaml, YAMLParseError } from "yaml";
import type { ZodError, ZodType } from "zod";
import { blockRegistry, kindRegistry, type BlockDef } from "../registry";
import { findTallInlineMath, placeholders } from "../markup";
import {
  CourseFile, EvaluationFile, NodeFields, SemesterFile, SourcesFile, TopicFile, type VarValue,
} from "./schemas";
import type {
  BodyEntry, ContentGraph, ContentIssue, ContentNode, Course, Edge, Evaluation, GraphNodeRef, Semester,
} from "./types";

export type RawFiles = Record<string, string>;

/** Normalizes any glob/fs path to "content/…" with forward slashes. */
export function normalizePath(p: string): string {
  const s = p.replace(/\\/g, "/");
  const i = s.lastIndexOf("content/semesters/");
  return i >= 0 ? s.slice(i) : s;
}

const zodIssues = (err: ZodError, file: string, base = ""): ContentIssue[] =>
  err.issues.map((i) => ({
    severity: "error",
    file,
    path: joinPath(base, i.path.map(String).join(".")),
    message: i.code === "invalid_type" && /received undefined/.test(i.message) && i.path.length ? `missing required field "${String(i.path[i.path.length - 1])}"` : i.message,
    hint: i.code === "unrecognized_keys" ? "remove the unknown field or check its spelling (see docs/content-format.md)" : undefined,
  }));

const joinPath = (a: string, b: string) => (a && b ? `${a}.${b}` : a || b);

function parseFile<T>(files: RawFiles, file: string, schema: ZodType<T>, issues: ContentIssue[]): T | undefined {
  const text = files[file];
  if (text === undefined) return undefined;
  let data: unknown;
  try {
    data = parseYaml(text, { prettyErrors: true });
  } catch (e) {
    const msg = e instanceof YAMLParseError ? e.message.split("\n")[0]! : String(e);
    issues.push({ severity: "error", file, path: "", message: `YAML syntax error: ${msg}`, hint: "check indentation and quote strings containing ':' or '#'" });
    return undefined;
  }
  const res = schema.safeParse(data);
  if (!res.success) {
    issues.push(...zodIssues(res.error, file));
    return undefined;
  }
  return res.data;
}

interface NodeCtx {
  file: string;
  issues: ContentIssue[];
  language: string;
}

const BASE_KEYS = new Set(Object.keys(NodeFields.shape).concat("schema"));

/** Validates one body item list (blocks, and nodes when allowed). */
function parseBody(raw: unknown[], ctx: NodeCtx, path: string, parentId: string, depth: number, allowNodes: boolean, blockPathPrefix = ""): BodyEntry[] {
  const out: BodyEntry[] = [];
  raw.forEach((item, i) => {
    const here = `${path}[${i}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      ctx.issues.push({ severity: "error", file: ctx.file, path: here, message: "a body item must be a mapping like { text: … } or { node: … }" });
      return;
    }
    const keys = Object.keys(item);
    if (keys.length !== 1) {
      ctx.issues.push({ severity: "error", file: ctx.file, path: here, message: `a body item has exactly one key, found ${keys.length ? keys.join(", ") : "none"}`, hint: "wrap each block in its own list item: - text: …" });
      return;
    }
    const key = keys[0]!;
    const value = (item as Record<string, unknown>)[key];
    if (key === "node") {
      if (!allowNodes) {
        ctx.issues.push({ severity: "error", file: ctx.file, path: here, message: "nodes can't be nested inside blocks", hint: "put the node directly in a node body; use blocks inside collapsibles/columns" });
        return;
      }
      const node = parseNode(value, ctx, `${here}.node`, parentId, depth + 1);
      if (node) out.push({ type: "node", node });
      return;
    }
    const def = blockRegistry.get(key);
    if (!def) {
      const s = blockRegistry.suggest(key);
      ctx.issues.push({ severity: "error", file: ctx.file, path: here, message: `unknown block type "${key}"`, hint: s.length ? `did you mean ${s.map((x) => `"${x}"`).join(" or ")}?` : `available: ${blockRegistry.keys().join(", ")}` });
      return;
    }
    const blockPath = blockPathPrefix ? `${blockPathPrefix}.${i}` : String(i);
    const props = parseBlock(def, value, ctx, `${here}.${key}`, parentId, depth, blockPath);
    if (props !== undefined) out.push({ type: "block", blockType: key, props, path: blockPath });
  });
  return out;
}

function parseBlock(def: BlockDef, value: unknown, ctx: NodeCtx, path: string, parentId: string, depth: number, blockPath: string): unknown {
  const res = def.schema.safeParse(value);
  if (!res.success) {
    ctx.issues.push(...zodIssues(res.error, ctx.file, path).map((i) => ({ ...i, hint: i.hint ?? `see the "${def.type}" entry in skills/build-course/catalog.md` })));
    return undefined;
  }
  const props = res.data;
  for (const s of def.markup?.(props) ?? []) {
    for (const hit of findTallInlineMath(s)) {
      ctx.issues.push({ severity: "warning", file: ctx.file, path, message: `tall inline math (${hit.what}): $${hit.tex}$`, hint: "move it to its own `math` block so it doesn't stretch the ruled line" });
    }
  }
  // nested block lists are validated (and normalized) recursively; nodes are not allowed inside blocks
  def.children?.(props).forEach((list, li) => {
    parseBody(list, ctx, `${path}<${li}>`, parentId, depth, false, `${blockPath}.${li}`);
  });
  return props;
}

function parseNode(raw: unknown, ctx: NodeCtx, path: string, parentId: string | undefined, depth: number, top = false): ContentNode | undefined {
  const base = (top ? TopicFile : NodeFields).loose().safeParse(raw);
  if (!base.success) {
    ctx.issues.push(...zodIssues(base.error, ctx.file, path));
    return undefined;
  }
  const f = base.data;
  const kind = kindRegistry.get(f.kind);
  if (!kind) {
    const s = kindRegistry.suggest(f.kind);
    ctx.issues.push({ severity: "error", file: ctx.file, path: joinPath(path, "kind"), message: `unknown node kind "${f.kind}"`, hint: s.length ? `did you mean ${s.join(" or ")}?` : `available kinds: ${kindRegistry.keys().join(", ")}` });
  }
  const extraRaw: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (!BASE_KEYS.has(k)) extraRaw[k] = v;
  let extra: Record<string, unknown> = {};
  if (Object.keys(extraRaw).length) {
    if (!kind?.fields) {
      ctx.issues.push({ severity: "error", file: ctx.file, path, message: `unknown field(s) ${Object.keys(extraRaw).join(", ")} on a "${f.kind}" node`, hint: "check spelling; kind-specific fields are listed in docs/content-format.md" });
    } else {
      const r = kind.fields.safeParse(extraRaw);
      if (r.success) extra = r.data;
      else ctx.issues.push(...zodIssues(r.error, ctx.file, path));
    }
  } else if (kind?.fields) {
    const r = kind.fields.safeParse({});
    if (!r.success) ctx.issues.push(...zodIssues(r.error, ctx.file, path));
  }

  const node: ContentNode = {
    id: f.id,
    kind: f.kind,
    title: f.title,
    container: f.container ?? kind?.container ?? false,
    weight: f.weight,
    number: f.number,
    note: f.note,
    vars: f.vars ?? {},
    sources: f.sources ?? [],
    relations: f.relations ?? [],
    extra,
    body: [],
    children: [],
    parentId,
    depth,
    file: ctx.file,
  };
  node.body = parseBody(f.body, ctx, joinPath(path, "body"), f.id, depth, true);
  node.children = node.body.flatMap((b) => (b.type === "node" ? [b.node] : []));
  for (const issue of kind?.validate?.(node) ?? []) ctx.issues.push({ ...issue, file: ctx.file, path: joinPath(path, issue.path) });
  return node;
}

/** Walks a node tree depth-first (node first, then its child nodes in body order). */
export function walkNodes(nodes: ContentNode[], fn: (n: ContentNode) => void): void {
  for (const n of nodes) {
    fn(n);
    walkNodes(n.children, fn);
  }
}

/** Walks every block (including nested ones) of one node, not of its child nodes. */
export function walkBlocks(node: ContentNode, fn: (blockType: string, props: unknown, path: string) => void): void {
  const visit = (entries: { blockType: string; props: unknown; path: string }[]) => {
    for (const e of entries) {
      fn(e.blockType, e.props, e.path);
      const def = blockRegistry.get(e.blockType);
      def?.children?.(e.props).forEach((list, li) =>
        visit(
          (list as Record<string, unknown>[]).flatMap((item, i) => {
            const [k, v] = Object.entries(item ?? {})[0] ?? [];
            if (!k || k === "node") return [];
            const parsed = blockRegistry.get(k)?.schema.safeParse(v);
            return parsed?.success ? [{ blockType: k, props: parsed.data, path: `${e.path}.${li}.${i}` }] : [];
          }),
        ),
      );
    }
  };
  visit(node.body.flatMap((b) => (b.type === "block" ? [b] : [])));
}

const dirOf = (p: string) => p.slice(0, p.lastIndexOf("/"));
const seg = (p: string, after: string) => p.slice(p.indexOf(after) + after.length).split("/")[0]!;

export function buildContent(input: RawFiles): ContentGraph {
  const files: RawFiles = {};
  for (const [k, v] of Object.entries(input)) files[normalizePath(k)] = v;
  const paths = Object.keys(files).sort();
  const issues: ContentIssue[] = [];
  const semesters: Semester[] = [];
  const courses = new Map<string, Course>();
  const evaluations = new Map<string, Evaluation>();
  const nodes = new Map<string, GraphNodeRef>();
  const edges: Edge[] = [];

  for (const semFile of paths.filter((p) => /^content\/semesters\/[^/]+\/semester\.ya?ml$/.test(p))) {
    const semDir = dirOf(semFile);
    const folder = seg(semFile, "content/semesters/");
    const sem = parseFile(files, semFile, SemesterFile, issues);
    if (!sem) continue;
    if (sem.id !== folder) issues.push({ severity: "error", file: semFile, path: "id", message: `id "${sem.id}" must match its folder "${folder}"` });
    const semester: Semester = { id: sem.id, data: sem, courses: [], file: semFile };
    semesters.push(semester);

    const courseFiles = paths.filter((p) => p.startsWith(`${semDir}/courses/`) && /\/courses\/[^/]+\/course\.ya?ml$/.test(p));
    const found = new Set<string>();
    for (const courseFile of courseFiles) {
      const courseDir = dirOf(courseFile);
      const cFolder = seg(courseFile, `${semDir}/courses/`);
      const cIssues: ContentIssue[] = [];
      const data = parseFile(files, courseFile, CourseFile, cIssues);
      if (!data) {
        issues.push(...cIssues);
        continue;
      }
      found.add(data.id);
      if (data.id !== cFolder) cIssues.push({ severity: "error", file: courseFile, path: "id", message: `id "${data.id}" must match its folder "${cFolder}"` });
      if (!sem.courses.includes(data.id)) cIssues.push({ severity: "warning", file: semFile, path: "courses", message: `course "${data.id}" exists but isn't listed in the semester`, hint: `add "${data.id}" to courses` });
      const sourcesFile = `${courseDir}/sources.yaml`;
      const src = parseFile(files, sourcesFile, SourcesFile, cIssues);
      if (!files[sourcesFile]) cIssues.push({ severity: "warning", file: courseFile, path: "", message: "no sources.yaml next to course.yaml", hint: "register the course's source files so nodes can cite them" });
      const sources = new Map((src?.sources ?? []).map((s) => [s.id, s]));
      for (const b of data.bibliography) if (!sources.has(b)) cIssues.push({ severity: "error", file: courseFile, path: "bibliography", message: `bibliography ref "${b}" is not in sources.yaml` });
      const locIds = new Set(data.locations.map((l) => l.id));
      data.schedule.forEach((s, i) => {
        if (s.location && data.locations.length && !locIds.has(s.location))
          cIssues.push({ severity: "warning", file: courseFile, path: `schedule.${i}.location`, message: `location "${s.location}" is not one of locations[].id` });
        if (s.end <= s.start) cIssues.push({ severity: "error", file: courseFile, path: `schedule.${i}`, message: "class ends before it starts" });
      });

      const course: Course = { key: `${sem.id}/${data.id}`, id: data.id, semesterId: sem.id, data, sources, evaluations: [], dir: courseDir, issues: cIssues };
      const idPrefix = `${data.idPrefix ?? data.id}/`;

      const evalIds = new Set<string>();
      for (const meta of data.evaluations) {
        if (evalIds.has(meta.id)) cIssues.push({ severity: "error", file: courseFile, path: "evaluations", message: `duplicate evaluation id "${meta.id}"` });
        evalIds.add(meta.id);
        const evalDir = `${courseDir}/evaluations/${meta.id}`;
        const evalFile = `${evalDir}/evaluation.yaml`;
        const ev: Evaluation = { key: `${course.key}/${meta.id}`, id: meta.id, meta, issues: [] };
        if (files[evalFile] !== undefined) {
          const efile = parseFile(files, evalFile, EvaluationFile, ev.issues);
          if (efile) {
            if (efile.id !== meta.id) ev.issues.push({ severity: "error", file: evalFile, path: "id", message: `id "${efile.id}" must match its folder "${meta.id}"` });
            const topics: ContentNode[] = [];
            efile.topics.forEach((t, ti) => {
              const tf = `${evalDir}/topics/${t}`;
              if (files[tf] === undefined) {
                ev.issues.push({ severity: "error", file: evalFile, path: `topics.${ti}`, message: `topic file "${t}" not found in topics/` });
                return;
              }
              let parsed: unknown;
              try {
                parsed = parseYaml(files[tf]!, { prettyErrors: true });
              } catch (e) {
                ev.issues.push({ severity: "error", file: tf, path: "", message: `YAML syntax error: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`, hint: "check indentation; quote strings with ':' and escape backslashes in double quotes (\\\\frac)" });
                return;
              }
              const node = parseNode(parsed, { file: tf, issues: ev.issues, language: data.language }, "", undefined, 0, true);
              if (node) topics.push(node);
            });
            ev.content = { title: efile.title, paper: efile.paper, topics, file: evalFile, dir: evalDir };
            checkEvaluation(ev, course, idPrefix);
          }
        }
        for (const i of ev.issues) cIssues.push(i);
        course.evaluations.push(ev);
        evaluations.set(ev.key, ev);
      }
      // evaluation folders without metadata
      for (const p of paths.filter((x) => x.startsWith(`${courseDir}/evaluations/`) && x.endsWith("/evaluation.yaml"))) {
        const id = seg(p, `${courseDir}/evaluations/`);
        if (!evalIds.has(id)) cIssues.push({ severity: "error", file: p, path: "", message: `evaluation folder "${id}" isn't declared in course.yaml evaluations`, hint: "add it to evaluations with kind, title and date" });
      }
      issues.push(...cIssues);
      semester.courses.push(course);
      courses.set(course.key, course);
    }
    for (const c of sem.courses) if (!found.has(c)) issues.push({ severity: "error", file: semFile, path: "courses", message: `course "${c}" is listed but courses/${c}/course.yaml doesn't exist` });
    semester.courses.sort((a, b) => sem.courses.indexOf(a.id) - sem.courses.indexOf(b.id));
  }

  // global ID graph: uniqueness across everything (user state is keyed by node id), edges, orphans
  for (const course of courses.values()) {
    for (const ev of course.evaluations) {
      if (!ev.content) continue;
      for (const topic of ev.content.topics) {
        walkNodes([topic], (n) => {
          const prev = nodes.get(n.id);
          if (prev) {
            const issue: ContentIssue = { severity: "error", file: n.file, path: "", message: `duplicate node id "${n.id}" (also in ${prev.node.file})`, hint: "IDs must be unique across all content; user progress is keyed by them" };
            issues.push(issue);
            ev.issues.push(issue);
            return;
          }
          nodes.set(n.id, { node: n, topicId: topic.id, evaluationKey: ev.key, courseKey: course.key });
          for (const r of n.relations) edges.push({ from: n.id, to: r.target, type: r.type });
        });
      }
    }
  }
  for (const e of edges) {
    if (!nodes.has(e.to)) {
      const ref = nodes.get(e.from)!;
      issues.push({ severity: "warning", file: ref.node.file, path: `${e.from}.relations`, message: `relation target "${e.to}" doesn't exist (orphan)`, hint: "fix the id or remove the relation" });
    }
  }
  semesters.sort((a, b) => (a.data.start < b.data.start ? 1 : -1));
  return { semesters, courses, evaluations, nodes, edges, issues };
}

/** Per-evaluation checks that need the whole tree: source refs, id prefix, page variables. */
function checkEvaluation(ev: Evaluation, course: Course, idPrefix: string): void {
  const content = ev.content!;
  const declared = new Map<string, { value: VarValue; node: string }>();
  walkNodes(content.topics, (n) => {
    if (!n.id.startsWith(idPrefix)) ev.issues.push({ severity: "warning", file: n.file, path: n.id, message: `node id "${n.id}" doesn't start with the course prefix "${idPrefix}"` });
    n.sources.forEach((s, i) => {
      if (s.ref !== undefined && !course.sources.has(s.ref)) {
        ev.issues.push({ severity: "error", file: n.file, path: `${n.id}.sources.${i}`, message: `source "${s.ref}" isn't registered in sources.yaml`, hint: `known sources: ${[...course.sources.keys()].join(", ") || "(none)"}` });
      }
    });
    for (const [k, v] of Object.entries(n.vars)) {
      const prev = declared.get(k);
      if (prev && prev.value !== v) ev.issues.push({ severity: "error", file: n.file, path: `${n.id}.vars.${k}`, message: `page variable "${k}" is declared twice with different values (also in ${prev.node})` });
      declared.set(k, { value: v, node: n.id });
    }
  });
  walkNodes(content.topics, (n) => {
    walkBlocks(n, (type, props, path) => {
      const def = blockRegistry.get(type);
      if (!def) return;
      const used = [...(def.reads?.(props) ?? []), ...(def.writes?.(props) ?? []), ...(def.markup?.(props) ?? []).flatMap(placeholders)];
      for (const v of new Set(used)) {
        if (!declared.has(v)) ev.issues.push({ severity: "error", file: n.file, path: `${n.id} › ${type}@${path}`, message: `block uses page variable "${v}" that no node declares`, hint: `add \`vars: { ${v}: <initial value> }\` to the topic or an ancestor node` });
      }
    });
  });
}

/** Initial values of every page variable declared in an evaluation. */
export function pageVars(topics: ContentNode[]): Record<string, VarValue> {
  const out: Record<string, VarValue> = {};
  walkNodes(topics, (n) => Object.assign(out, n.vars));
  return out;
}

export const hasErrors = (issues: ContentIssue[]) => issues.some((i) => i.severity === "error");
