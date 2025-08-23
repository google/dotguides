import { describe, it, expect, vi, beforeEach } from "vitest";
import { Doc } from "./doc.js";
import { vol } from "memfs";
import type { fs } from "memfs";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("Doc", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should be instantiable", async () => {
    const filePath = "/test.md";
    const fileContent = "doc content";
    vol.fromJSON({ [filePath]: fileContent });

    const doc = await Doc.load(
      { path: filePath },
      { name: "Test Doc", description: "A test document.", path: filePath }
    );
    expect(doc).toBeInstanceOf(Doc);
    const content = await doc.content;
    expect(content[0]?.type).toBe("text");
    if (content[0]?.type === "text") {
      expect(content[0]?.text).toBe(fileContent);
    }
  });
});
