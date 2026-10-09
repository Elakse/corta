/**
 * Reads the Mermaid subset the courses use for flowcharts and state diagrams into a GraphSpec.
 * Returns null for anything it does not fully understand (class and sequence diagrams, subgraphs, styling…),
 * so the caller falls back to Mermaid itself: nothing is ever half-drawn.
 */
import type { Direction, GraphEdge, GraphNode, GraphSpec } from "./types";

const ID = /^[\wÀ-￿]+/;
const ENTITIES: Record<string, string> = { "&quot;": '"', "&lt;": "<", "&gt;": ">", "&amp;": "&", "&nbsp;": " " };

/** `<br/>` → line break, a few entities decoded; other HTML means we don't understand the label. */
function cleanLabel(raw: string): string | null {
  const t = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&(quot|lt|gt|amp|nbsp);/g, (m) => ENTITIES[m]!)
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(+n));
  if (/<\/?[a-z]/i.test(t)) return null;
  return t.split("\n").map((l) => l.trim()).join("\n").trim();
}

const toDirection = (d: string): Direction => (d === "TD" || d === "TB" ? "TB" : (d as Direction));

const SHAPES: { open: string; close: string; shape: string }[] = [
  { open: "((", close: "))", shape: "circle" },
  { open: "([", close: "])", shape: "pill" },
  { open: "(", close: ")", shape: "rect" },
  { open: "[", close: "]", shape: "rect" },
  { open: "{", close: "}", shape: "diamond" },
];
const UNSUPPORTED_OPENERS = ["[(", "[[", "{{", "(((", ">", "[/", "[\\", "(["];

const LINKS: { re: RegExp; style: string; arrow: boolean }[] = [
  { re: /^-->/, style: "solid", arrow: true },
  { re: /^---/, style: "solid", arrow: false },
  { re: /^-\.->/, style: "dashed", arrow: true },
  { re: /^-\.-/, style: "dashed", arrow: false },
  { re: /^==>/, style: "strong", arrow: true },
  { re: /^===/, style: "strong", arrow: false },
];
/** `A -- text --> B` forms */
const INLINE_LINKS: { re: RegExp; style: string }[] = [
  { re: /^--\s+(.+?)\s+(-->|---)/, style: "solid" },
  { re: /^-\.\s+(.+?)\s+(\.->|\.-)/, style: "dashed" },
  { re: /^==\s+(.+?)\s+(==>|===)/, style: "strong" },
];

class Builder {
  nodes = new Map<string, GraphNode & { explicit: boolean }>();
  edges: GraphEdge[] = [];
  node(id: string, label?: string, shape?: string) {
    const cur = this.nodes.get(id);
    if (!cur) this.nodes.set(id, { id, label: label ?? id, shape: shape ?? "rect", explicit: label !== undefined });
    else if (label !== undefined && !cur.explicit) Object.assign(cur, { label, shape: shape ?? "rect", explicit: true });
  }
  spec(direction: Direction): GraphSpec {
    return { direction, nodes: [...this.nodes.values()].map(({ explicit: _x, ...n }) => n), edges: this.edges };
  }
}

/** Parses a node reference at the start of `s`: `id`, `id[text]`, `id(("text"))`… Returns the rest of the string. */
function nodeRef(s: string, b: Builder): { id: string; rest: string } | null {
  const m = ID.exec(s);
  if (!m) return null;
  const id = m[0];
  let rest = s.slice(id.length);
  if (UNSUPPORTED_OPENERS.some((o) => rest.startsWith(o) && !SHAPES.some((sh) => sh.open === o))) return null;
  const sh = SHAPES.find((x) => rest.startsWith(x.open));
  if (!sh) {
    b.node(id);
    return { id, rest };
  }
  rest = rest.slice(sh.open.length);
  let text: string;
  if (rest.startsWith('"')) {
    const end = rest.indexOf('"', 1);
    if (end < 0) return null;
    text = rest.slice(1, end);
    rest = rest.slice(end + 1).trimStart();
    if (!rest.startsWith(sh.close)) return null;
  } else {
    const end = rest.indexOf(sh.close);
    if (end < 0) return null;
    text = rest.slice(0, end);
    rest = rest.slice(end);
  }
  rest = rest.slice(sh.close.length);
  const label = cleanLabel(text);
  if (label === null) return null;
  b.node(id, label, sh.shape);
  return { id, rest };
}

function flowchart(lines: string[], direction: Direction): GraphSpec | null {
  const b = new Builder();
  for (let line of lines) {
    line = line.replace(/;\s*$/, "").trim();
    if (!line || line.startsWith("%%")) continue;
    if (/^(subgraph|end|style|classDef|class|click|linkStyle|direction)\b/.test(line) || line.includes("&")) return null;
    let cur = nodeRef(line, b);
    if (!cur) return null;
    for (;;) {
      const rest = cur.rest.trimStart();
      if (!rest) break;
      let style = "solid", arrow = true, label: string | undefined, after: string;
      const inline = INLINE_LINKS.map((l) => ({ l, m: l.re.exec(rest) })).find((x) => x.m);
      if (inline?.m) {
        const text = cleanLabel(inline.m[1]!);
        if (text === null) return null;
        label = text;
        style = inline.l.style;
        arrow = inline.m[2]!.endsWith(">");
        after = rest.slice(inline.m[0].length);
      } else {
        const link = LINKS.find((l) => l.re.test(rest));
        if (!link) return null;
        ({ style, arrow } = link);
        after = rest.slice(rest.match(link.re)![0].length).trimStart();
        if (after.startsWith("|")) {
          const end = after.indexOf("|", 1);
          if (end < 0) return null;
          const raw = after.slice(1, end).trim();
          const text = cleanLabel(raw.startsWith('"') && raw.endsWith('"') && raw.length > 1 ? raw.slice(1, -1) : raw);
          if (text === null) return null;
          label = text;
          after = after.slice(end + 1);
        }
      }
      const next = nodeRef(after.trimStart(), b);
      if (!next) return null;
      b.edges.push({ from: cur.id, to: next.id, ...(label ? { label } : {}), ...(style !== "solid" ? { style } : {}), ...(arrow ? {} : { arrow: false }) });
      cur = next;
    }
  }
  return b.nodes.size ? b.spec(direction) : null;
}

function stateDiagram(lines: string[]): GraphSpec | null {
  const b = new Builder();
  let direction: Direction = "TB";
  const endpoint = (raw: string, role: "from" | "to"): string | null => {
    if (raw === "[*]") {
      const id = role === "from" ? "__start" : "__end";
      if (!b.nodes.has(id)) b.nodes.set(id, { id, label: "", shape: role === "from" ? "start" : "end", explicit: true });
      return id;
    }
    if (!/^[\wÀ-￿]+$/.test(raw)) return null;
    b.node(raw);
    return raw;
  };
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("%%")) continue;
    const dir = /^direction\s+(LR|RL|TB|TD|BT)$/.exec(t);
    if (dir) { direction = toDirection(dir[1]!); continue; }
    const m = /^(\[\*\]|[\wÀ-￿]+)\s*-->\s*(\[\*\]|[\wÀ-￿]+)\s*(?::\s*(.+))?$/.exec(t);
    if (!m) return null;
    const from = endpoint(m[1]!, "from"), to = endpoint(m[2]!, "to");
    if (!from || !to) return null;
    const label = m[3] === undefined ? undefined : cleanLabel(m[3]);
    if (label === null) return null;
    b.edges.push({ from, to, ...(label ? { label } : {}) });
  }
  return b.nodes.size ? b.spec(direction) : null;
}

export function parseMermaid(code: string): GraphSpec | null {
  const lines = code.replace(/\r/g, "").split("\n");
  const first = lines.findIndex((l) => l.trim() && !l.trim().startsWith("%%"));
  if (first < 0) return null;
  const head = lines[first]!.trim();
  const rest = lines.slice(first + 1);
  const flow = /^(?:flowchart|graph)(?:\s+(TB|TD|BT|RL|LR))?\s*;?$/i.exec(head);
  if (flow) return flowchart(rest, toDirection((flow[1] ?? "TB").toUpperCase()));
  if (/^stateDiagram(-v2)?$/.test(head)) return stateDiagram(rest);
  return null;
}
