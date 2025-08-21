import { describe, it, expect, vi, beforeEach } from "vitest";
import { Guide } from "./guide.js";
import { vol } from "memfs";
import type { fs } from "memfs";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("Guide", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should be instantiable", async () => {
    const filePath = "/test.md";
    const fileContent = "guide content";
    vol.fromJSON({ [filePath]: fileContent });

    const guide = await Guide.load(
      { path: filePath },
      { description: "Test Guide" }
    );
    expect(guide).toBeInstanceOf(Guide);
    expect(guide.content).toBe(fileContent);
  });
});
