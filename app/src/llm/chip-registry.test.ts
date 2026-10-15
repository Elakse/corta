import { describe, expect, it } from "vitest";
import type { ContentGraph } from "@/core/content";
import { renderChatMarkdown } from "./chip-registry";
import "./chips";

const graph = {
  courses: new Map([["s/c", { sources: new Map([
    ["clase-3", { id: "clase-3", path: "sources/classes/Clase 3.pdf", kind: "class", title: "Clase 3: Bayes", short: "Clase 3" }],
    ["foto", { id: "foto", path: "sources/syllabus/fechas.jpg", kind: "schedule", title: "Fechas", short: "Fechas" }],
  ]) }]]),
} as unknown as ContentGraph;

describe("chat chips", () => {
  it("turns source chips into links that open the original at the page", () => {
    const html = renderChatMarkdown("Sale de [[source:clase-3|12]] y $x$.", { graph, courseKey: "s/c" });
    expect(html).toContain('href="/api/sources/s/c/clase-3/file#page=12"');
    expect(html).toContain("Clase 3 · p.12");
    expect(html).toContain("katex");
  });
  it("drops the page for files without pages and disables unknown refs", () => {
    expect(renderChatMarkdown("[[source:foto|2]]", { graph, courseKey: "s/c" })).toContain('href="/api/sources/s/c/foto/file"');
    const unknown = renderChatMarkdown("[[source:nope|4]]", { graph, courseKey: "s/c" });
    expect(unknown).toContain("cchip-off");
    expect(unknown).not.toContain("href");
  });
  it("leaves unregistered chip names as text", () => {
    expect(renderChatMarkdown("[[weird:x]]", { graph, courseKey: "s/c" })).toContain("[[weird:x]]");
  });
});
