import { describe, it, expect, vi, beforeEach } from "vitest";
import { JavascriptLanguageAdapter } from "./javascript.js";
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

describe("JavascriptLanguageAdapter", () => {
  beforeEach(() => {
    vol.reset();
  });

  describe("discover", () => {
    it("should return not detected if package.json is not found", async () => {
      vol.fromJSON({});
      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");
      expect(context.detected).toBe(false);
      expect(context.name).toBe("javascript");
    });

    it("should return typescript if tsconfig.json is found", async () => {
      vol.fromJSON({
        "/test/workspace/tsconfig.json": "{}",
      });
      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");
      expect(context.name).toBe("typescript");
    });

    it("should return detected if package.json is found", async () => {
      vol.fromJSON({
        "/test/workspace/package.json": "{}",
      });
      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");
      expect(context.detected).toBe(true);
    });

    it("should detect pnpm from pnpm-lock.yaml", async () => {
      vol.fromJSON({
        "/test/workspace/package.json": "{}",
        "/test/workspace/pnpm-lock.yaml": "",
      });
      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");
      expect(context.packageManager).toBe("pnpm");
    });

    it("should discover packages and contrib packages", async () => {
      vol.fromJSON({
        "/test/workspace/package.json": JSON.stringify({
          dependencies: {
            "package-a": "1.0.0",
            "package-b": "1.0.0",
            "@scope/package-c": "1.0.0",
          },
        }),
        "/test/workspace/node_modules/package-a/.guides/guides.json": "{}",
        "/test/workspace/node_modules/@dotguides-contrib/package-b/guides.json":
          "{}",
        "/test/workspace/node_modules/@dotguides-contrib/scope__package-c/guides.json":
          "{}",
      });

      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");

      expect(context.packages).toHaveLength(3);
      expect(context.packages.sort()).toEqual([
        "@scope/package-c",
        "package-a",
        "package-b",
      ]);
    });
  });

  describe("loadPackage", () => {
    it("should load a package", async () => {
      vol.fromJSON({
        "/test/workspace/node_modules/package-a/.guides/guides.json": "{}",
      });

      const adapter = new JavascriptLanguageAdapter();
      const pkg = await adapter.loadPackage("/test/workspace", "package-a");
      expect(pkg.name).toBe("package-a");
    });

    it("should load a contrib package", async () => {
      vol.fromJSON({
        "/test/workspace/node_modules/@dotguides-contrib/package-b/guides.json":
          "{}",
      });

      const adapter = new JavascriptLanguageAdapter();
      const pkg = await adapter.loadPackage("/test/workspace", "package-b");
      expect(pkg.name).toBe("package-b");
    });
  });
});
