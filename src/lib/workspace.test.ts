import { describe, it, expect, vi, beforeEach } from "vitest";
import { Workspace } from "./workspace.js";
import { vol } from "memfs";
import type { fs } from "memfs";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

vi.mock("fs", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs;
});

describe("Workspace", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should initialize workspace by detecting language and discovering packages", async () => {
    const directories = ["/test/workspace"];
    vol.fromJSON({
      "/test/workspace/package.json": JSON.stringify({
        dependencies: { "package-a": "1.0.0", "package-b": "1.0.0" },
      }),
      "/test/workspace/pnpm-lock.yaml": "",
      "/test/workspace/node_modules/package-a/.guides/guides.json":
        JSON.stringify({ guides: { setup: { description: "a" } } }),
      "/test/workspace/node_modules/@dotguides-contrib/package-b/guides.json":
        JSON.stringify({ guides: { setup: { description: "b" } } }),
    });

    const workspace = await Workspace.load(directories);

    expect(Object.keys(workspace.packages).length).toBe(2);
    expect(workspace.packages["package-a"]).toBeDefined();
    expect(workspace.packages["package-b"]).toBeDefined();

    const contexts = workspace.languages;
    expect(contexts).toHaveLength(1);
    const context = contexts[0];
    if (context) {
      expect(context.detected).toBe(true);
      expect(context.packageManager).toBe("pnpm");
      expect(context.packages).toEqual(["package-a", "package-b"]);
    } else {
      expect(context).toBeDefined();
    }
  });
});
