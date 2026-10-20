import { describe, expect, it } from "vitest";
import { isAnchor, pickAnchor, readingKey, restoreDelta } from "./reading-position";

describe("pickAnchor", () => {
  const line = 60;
  it("takes the innermost node containing the reading line", () => {
    const boxes = [
      { id: "topic", top: -500, bottom: 900 },
      { id: "topic/def", top: -40, bottom: 200 },
      { id: "topic/later", top: 300, bottom: 500 },
    ];
    expect(pickAnchor(boxes, line)).toEqual({ id: "topic/def", offset: 100 });
  });
  it("prefers a node containing the line over a nearer one that already ended", () => {
    const boxes = [
      { id: "parent", top: -900, bottom: 400 },
      { id: "parent/closed", top: -100, bottom: 20 },
    ];
    expect(pickAnchor(boxes, line)).toEqual({ id: "parent", offset: 960 });
  });
  it("falls back to the nearest node above when the line sits in a gap", () => {
    const boxes = [
      { id: "a", top: -800, bottom: -300 },
      { id: "b", top: -200, bottom: 30 },
      { id: "c", top: 90, bottom: 300 },
    ];
    expect(pickAnchor(boxes, line)).toEqual({ id: "b", offset: 260 });
  });
  it("is null at the top of the page, before any node has started", () => {
    expect(pickAnchor([{ id: "a", top: 400, bottom: 800 }], line)).toBeNull();
    expect(pickAnchor([], line)).toBeNull();
  });
  it("counts a node whose top is within half a pixel of the line as started", () => {
    expect(pickAnchor([{ id: "a", top: 60.4, bottom: 300 }], line)).toEqual({ id: "a", offset: 0 });
  });
});

describe("restoreDelta", () => {
  it("is zero when the node already sits where it was saved", () => {
    expect(restoreDelta(-40, 60, { id: "a", offset: 100 })).toBe(0);
  });
  it("scrolls down when the node is lower than it was, up when higher", () => {
    expect(restoreDelta(500, 60, { id: "a", offset: 100 })).toBe(540);
    expect(restoreDelta(-300, 60, { id: "a", offset: 100 })).toBe(-260);
  });
});

describe("isAnchor / readingKey", () => {
  it("accepts only well-formed saved values", () => {
    expect(isAnchor({ id: "x", offset: 12 })).toBe(true);
    for (const bad of [null, undefined, "x", 3, {}, { id: "x" }, { id: 1, offset: 2 }, { id: "x", offset: NaN }]) expect(isAnchor(bad)).toBe(false);
  });
  it("keys by evaluation", () => {
    expect(readingKey("2026-C2/pdp/p1")).toBe("reading:2026-C2/pdp/p1");
  });
});
