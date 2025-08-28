import { describe, it, expect, vi, beforeEach } from "vitest";
import { Guide } from "./guide.js";
import { vol } from "memfs";
import type { fs } from "memfs";
import type { Package } from "./package.js";

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

    const mockPackage = { name: "test-pkg" } as Package;
    const guide = await Guide.load(mockPackage, {
      name: "usage",
      description: "Test Guide",
      path: filePath,
    });
    expect(guide).toBeInstanceOf(Guide);
    const content = await guide.render();
    expect(content[0]?.type).toBe("text");
    if (content[0]?.type === "text") {
      expect(content[0]?.text).toBe(fileContent);
    }
  });
});
