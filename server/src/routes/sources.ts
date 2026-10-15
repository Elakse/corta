import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { SourceHit, SourcePage } from "../../../shared/api";
import { CourseLibrary } from "../sources/library";
import { searchPages } from "../sources/text";

const MEDIA: Record<string, string> = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8",
};

/**
 * Read-only access to a course's original material: the files themselves (opened from chat citations)
 * and their extracted text (searched and read by the tutor when tracing where something comes from).
 */
export function sourceRoutes(contentRoots: string[]) {
  const label = (lib: CourseLibrary, ref: string) => {
    const s = lib.sources.get(ref)!;
    return { title: s.title ?? ref, short: s.short ?? s.title ?? ref };
  };
  return new Hono()
    .get("/:semester/:course/search", async (c) => {
      const lib = await CourseLibrary.open(contentRoots, c.req.param("semester"), c.req.param("course"));
      if (!lib) return c.json({ error: "Unknown course" }, 404);
      const q = (c.req.query("q") ?? "").slice(0, 500);
      const limit = Math.min(10, Math.max(1, Number(c.req.query("limit")) || 5));
      const wanted = (c.req.query("refs") ?? "").split(",").map((r) => r.trim()).filter((r) => lib.sources.has(r));
      const refs = wanted.length ? wanted : [...lib.sources.keys()];
      const docs = (await Promise.all(refs.map(async (ref) => ({ ref, pages: await lib.pages(ref) })))).filter((d): d is { ref: string; pages: string[] } => d.pages !== null);
      const hits: SourceHit[] = searchPages(docs, q, limit).map((h) => ({ ...h, ...label(lib, h.ref) }));
      return c.json({ hits, searched: docs.length });
    })
    .get("/:semester/:course/:ref/pages/:page", async (c) => {
      const lib = await CourseLibrary.open(contentRoots, c.req.param("semester"), c.req.param("course"));
      const ref = c.req.param("ref");
      if (!lib?.sources.has(ref)) return c.json({ error: "Unknown source" }, 404);
      const pages = await lib.pages(ref);
      if (!pages) return c.json({ error: "This source has no extracted text" }, 404);
      const page = Number(c.req.param("page"));
      if (!Number.isInteger(page) || page < 1 || page > pages.length) return c.json({ error: `Page must be between 1 and ${pages.length}` }, 400);
      const body: SourcePage = { ref, ...label(lib, ref), page, pages: pages.length, text: pages[page - 1]! };
      return c.json(body);
    })
    .get("/:semester/:course/:ref/file", async (c) => {
      const lib = await CourseLibrary.open(contentRoots, c.req.param("semester"), c.req.param("course"));
      const file = lib?.file(c.req.param("ref"));
      if (!file) return c.json({ error: "Source file not found" }, 404);
      const name = encodeURIComponent(basename(file));
      return c.body(await readFile(file), 200, {
        "content-type": MEDIA[extname(file).toLowerCase()] ?? "application/octet-stream",
        "content-disposition": `inline; filename*=UTF-8''${name}`,
        "cache-control": "no-cache",
      });
    });
}
