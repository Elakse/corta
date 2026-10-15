import { describe, expect, it } from "vitest";
import { captureShortcut, DEFAULT_CHAT_SHORTCUT, matchesShortcut } from "./shortcut";

const event = { key: "j", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
describe("chat shortcut", () => {
  it("supports either platform modifier and requires an exact chord", () => {
    expect(matchesShortcut(event, DEFAULT_CHAT_SHORTCUT)).toBe(true);
    expect(matchesShortcut({ ...event, ctrlKey: false, metaKey: true }, DEFAULT_CHAT_SHORTCUT)).toBe(true);
    expect(matchesShortcut({ ...event, shiftKey: true }, DEFAULT_CHAT_SHORTCUT)).toBe(false);
    expect(matchesShortcut(event, null)).toBe(false);
  });
  it("captures modified keys without hijacking bare typing or modifier keys", () => {
    expect(captureShortcut({ ...event, key: "k", shiftKey: true })).toEqual({ key: "k", primary: true, alt: false, shift: true });
    expect(captureShortcut({ ...event, ctrlKey: false })).toBeNull();
    expect(captureShortcut({ ...event, key: "Control" })).toBeNull();
  });
});
