import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb } from "../db/client";
import { createApp } from "../app";
import { fold, searchPages, splitPages } from "./text";
import { inside } from "./library";

describe("source text", () => {
  it("splits pages by extract markers and by form feeds", () => {
    expect(splitPages("# x\n\n=== page 1 ===\nuno\n\n=== page 2 ===\ndos\n")).toEqual(["uno", "dos"]);
    expect(splitPages("uno\fdos\f")).toEqual(["uno", "dos"]);
    expect(splitPages("solo")).toEqual(["solo"]);
  });
  it("folds accents without changing positions", () => {
    expect(fold("Álgebra Útil")).toBe("algebra util");
    expect(fold("Álgebra").length).toBe("Álgebra".length);
  });
  it("ranks the page with the most (and rarest) terms first, with an excerpt around them", () => {
    const docs = [
      { ref: "a", pages: ["Introducción general a la probabilidad.", "La regla de Bayes relaciona la probabilidad condicional de A dado B con la de B dado A."] },
      { ref: "b", pages: ["Ejercicios de conteo y probabilidad."] },
    ];
    const hits = searchPages(docs, "regla de Bayes condicional");
    expect(hits[0]).toMatchObject({ ref: "a", page: 2 });
    expect(hits[0]!.excerpt).toContain("Bayes");
    expect(searchPages(docs, "de la el")).toEqual([]);
  });
  it("keeps paths inside their folder", () => {
    expect(inside("/c", "sources/a.pdf")).toBe(join("/c", "sources/a.pdf"));
    expect(inside("/c", "../secret")).toBeNull();
    expect(inside("/c", "/etc/passwd")).toBeNull();
  });
});

describe("source routes", () => {
  const root = mkdtempSync(join(tmpdir(), "corta-src-"));
  let app: ReturnType<typeof createApp>;
  beforeAll(async () => {
    const course = join(root, "semesters", "s1", "courses", "c1");
    mkdirSync(join(course, "sources", "classes"), { recursive: true });
    mkdirSync(join(course, "processed", "text"), { recursive: true });
    writeFileSync(join(course, "sources.yaml"), `schema: 1\nsources:\n  - { id: clase-1, path: "sources/classes/Clase 1.pdf", kind: class, title: "Clase 1: Espacios", short: "Clase 1" }\n  - { id: evil, path: "../../../../outside.txt", kind: other, title: Evil }\n`);
    writeFileSync(join(course, "sources", "classes", "Clase 1.pdf"), "%PDF-1.4 fake");
    writeFileSync(join(course, "processed", "text", "Clase 1.txt"), "Portada\fLos axiomas de Kolmogorov definen una probabilidad.\fBayes");
    writeFileSync(join(root, "outside.txt"), "nope");
    app = createApp(await openDb(":memory:"), { contentRoots: [root] });
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("searches extracted text and labels hits", async () => {
    const r = (await (await app.request("/api/sources/s1/c1/search?q=axiomas%20Kolmogorov")).json()) as { hits: { ref: string; page: number; short: string }[] };
    expect(r.hits[0]).toMatchObject({ ref: "clase-1", page: 2, short: "Clase 1" });
  });
  it("reads one page and rejects out-of-range pages", async () => {
    const r = (await (await app.request("/api/sources/s1/c1/clase-1/pages/2")).json()) as { text: string; pages: number };
    expect(r).toMatchObject({ pages: 3 });
    expect(r.text).toContain("Kolmogorov");
    expect((await app.request("/api/sources/s1/c1/clase-1/pages/9")).status).toBe(400);
  });
  it("serves original files inline and never outside the course", async () => {
    const r = await app.request("/api/sources/s1/c1/clase-1/file");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect((await app.request("/api/sources/s1/c1/evil/file")).status).toBe(404);
    expect((await app.request("/api/sources/s1/..%2F..%2Fx/clase-1/file")).status).toBe(404);
  });
});
