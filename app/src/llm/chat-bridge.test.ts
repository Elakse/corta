import { describe, expect, it } from "vitest";
import { passageBlock, referenceRequest } from "./chat-bridge";

describe("referencing a passage", () => {
  it("tells the model where the passage is and keeps the reader's question as what the bubble shows", () => {
    const request = referenceRequest({ text: "$Av = \\lambda v$", nodeId: "n/1", nodeTitle: "Autovalor" }, "¿Por qué?");
    expect(request.display).toBe("¿Por qué?");
    expect(request.quote).toBe("$Av = \\lambda v$");
    expect(request.nodeId).toBe("n/1");
    expect(request.prompt).toBe(`¿Por qué?\n\n${passageBlock({ text: "$Av = \\lambda v$", nodeId: "n/1", nodeTitle: "Autovalor" })}`);
    expect(request.prompt).toContain('Selected in node "Autovalor" (id: n/1).');
  });

  it("works for a passage outside any node", () => {
    const request = referenceRequest({ text: "hola", nodeId: null }, "?");
    expect(request.nodeId).toBeUndefined();
    expect(request.prompt).not.toContain("Selected in node");
  });
});
