import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "./command.js";
import { vol } from "memfs";
import type { fs } from "memfs";
import type { Package } from "./package.js";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("Command", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should be instantiable", async () => {
    const filePath = "/test.md";
    const fileContent = "command content";
    vol.fromJSON({ [filePath]: fileContent });

    const mockPackage = { name: "test-pkg" } as Package;
    const command = await Command.load(
      mockPackage,
      { path: filePath },
      {
        path: filePath,
        name: "Test Command",
        description: "A test command.",
        arguments: [],
      }
    );
    expect(command).toBeInstanceOf(Command);
  });
});
