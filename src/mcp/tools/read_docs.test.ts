import { describe, it, expect, vi } from "vitest";
import { read_docs } from "./read_docs.js";
import { Workspace } from "../../lib/workspace.js";
import { Doc } from "../../lib/doc.js";

describe("read_docs tool", () => {
  it("should read docs from the workspace", async () => {
    const mockDoc = {
      config: { name: "test-doc" },
      render: vi
        .fn()
        .mockResolvedValue([{ type: "text", text: "Hello, world!" }]),
    } as unknown as Doc;

    const mockWorkspace = {
      doc: vi.fn().mockReturnValue(mockDoc),
    } as unknown as Workspace;

    const result = await read_docs.fn(
      { uris: ["docs:test-pkg:test-doc"] },
      { workspace: mockWorkspace }
    );

    expect(mockWorkspace.doc).toHaveBeenCalledWith("test-pkg", "test-doc");
    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.text).toContain("Hello, world!");
  });
});
