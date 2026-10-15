/**
 * Pure helpers over extracted source text (`processed/text/*.txt`): page splitting and a small ranked
 * full-text search. No I/O here, so it is unit-tested directly.
 */

/** Pages of an extracted file: `=== page N ===` markers (npm run extract) or form feeds (pdftotext). Index 0 = page 1. */
export function splitPages(raw: string): string[] {
  const marker = /^=== page (\d+) ===[ \t]*$/gm;
  const marks = [...raw.matchAll(marker)];
  if (marks.length) {
    const pages: string[] = [];
    marks.forEach((m, i) => {
      const start = m.index! + m[0].length;
      const end = i + 1 < marks.length ? marks[i + 1]!.index! : raw.length;
      pages[Number(m[1]) - 1] = raw.slice(start, end).trim();
    });
    return Array.from(pages, (p) => p ?? "");
  }
  if (raw.includes("\f")) return raw.split("\f").map((p) => p.trim()).filter((p, i, all) => p || i < all.length - 1);
  return [raw.trim()];
}

/** Lowercase, accent-free copy with the same length, so match positions map back onto the original text. */
export function fold(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    const base = c.normalize("NFD")[0]!.toLowerCase();
    out += base.length === 1 ? base : c;
  }
  return out;
}

const STOP = new Set(
  ("de la el en los las del que con por para una uno unos unas como sus sea son ser esta este esto estos estas entre sobre " +
    "cuando donde tiene tienen tal cual cada todo toda todos todas pero sin mas muy hay dos tres " +
    "the and for with that this from are was were has have its into than then they which").split(" "),
);

export function terms(query: string): string[] {
  return [...new Set(fold(query).match(/[a-z0-9]+/g) ?? [])].filter((w) => (w.length >= 3 || /\d/.test(w)) && !STOP.has(w));
}

export interface SearchDoc {
  ref: string;
  pages: string[];
}
export interface SearchHit {
  ref: string;
  page: number;
  score: number;
  excerpt: string;
}

const EXCERPT = 420;

function occurrences(folded: string, term: string): number[] {
  const out: number[] = [];
  const re = new RegExp(`(?<![a-z0-9])${term}`, "g");
  for (let m = re.exec(folded); m; m = re.exec(folded)) out.push(m.index);
  return out;
}

/** The window of the page that contains the most distinct query terms. */
function excerpt(page: string, folded: string, hits: Map<string, number[]>): string {
  const marks = [...hits].flatMap(([t, pos]) => pos.map((p) => ({ t, p }))).sort((a, b) => a.p - b.p);
  let best = 0;
  let bestCount = -1;
  for (let i = 0; i < marks.length; i++) {
    const seen = new Set<string>();
    for (let j = i; j < marks.length && marks[j]!.p - marks[i]!.p < EXCERPT * 0.7; j++) seen.add(marks[j]!.t);
    if (seen.size > bestCount) { bestCount = seen.size; best = marks[i]!.p; }
  }
  let start = Math.max(0, best - Math.round(EXCERPT * 0.2));
  const back = folded.lastIndexOf("\n", start);
  if (back >= 0 && start - back < 80) start = back + 1;
  const end = Math.min(page.length, start + EXCERPT);
  const text = page.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${text}${end < page.length ? "…" : ""}`;
}

/**
 * Ranks pages by how many query terms they contain (rarer terms weigh more), with a bonus for the exact
 * phrase. Good enough to find "where in the material does this come from" without an index server.
 */
export function searchPages(docs: SearchDoc[], query: string, limit = 5): SearchHit[] {
  const qs = terms(query);
  if (!qs.length) return [];
  const phrase = fold(query).replace(/\s+/g, " ").trim();
  const pages = docs.flatMap((d) => d.pages.map((text, i) => ({ ref: d.ref, page: i + 1, text, folded: fold(text) })));
  const df = new Map(qs.map((t) => [t, pages.filter((p) => occurrences(p.folded, t).length).length]));
  const hits: SearchHit[] = [];
  for (const p of pages) {
    const found = new Map<string, number[]>();
    let score = 0;
    for (const t of qs) {
      const pos = occurrences(p.folded, t);
      if (!pos.length) continue;
      found.set(t, pos);
      score += Math.log(1 + pages.length / df.get(t)!) * (1 + Math.log(pos.length));
    }
    if (!found.size) continue;
    score *= (found.size / qs.length) ** 1.5;
    if (phrase.length > 12 && p.folded.replace(/\s+/g, " ").includes(phrase)) score *= 3;
    hits.push({ ref: p.ref, page: p.page, score: Math.round(score * 100) / 100, excerpt: excerpt(p.text, p.folded, found) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
