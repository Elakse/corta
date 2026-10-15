import { api } from "@/api/client";
import { defineChip } from "../chip-registry";

const PAGED = /\.pdf$/i;

/** `[[source:<ref>|<page>]]`: opens the original file in a new tab, at that page for PDFs. */
export default defineChip({
  name: "source",
  icon: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  resolve([ref = "", rawPage], { graph, courseKey }) {
    const page = Number.parseInt(rawPage ?? "", 10) || undefined;
    const entry = courseKey ? graph.courses.get(courseKey)?.sources.get(ref) : undefined;
    const name = entry?.short ?? entry?.title ?? ref;
    const paged = entry ? PAGED.test(entry.path) : false;
    const label = page && (paged || !entry) ? `${name} · p.${page}` : name;
    if (!entry || !courseKey) return { label, title: ref };
    return { label, title: entry.title ?? name, href: api.sources.fileUrl(courseKey, ref, paged ? page : undefined) };
  },
});
