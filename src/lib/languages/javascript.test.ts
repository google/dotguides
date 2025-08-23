import { describe, it, expect, vi, beforeEach } from "vitest";
import { JavascriptLanguageAdapter } from "./javascript.js";
import { vol } from "memfs";
import type { fs } from "memfs";
import { cachedFetch } from "../cached-fetch.js";
import type { Workspace } from "../workspace.js";

vi.mock("../cached-fetch.js");

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
        "/test/workspace/node_modules/package-a/.guides/config.json": "{}",
        "/test/workspace/node_modules/@dotguides-contrib/package-b/config.json":
          "{}",
        "/test/workspace/node_modules/@dotguides-contrib/scope__package-c/config.json":
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
        "/test/workspace/node_modules/package-a/.guides/config.json": "{}",
      });

      const adapter = new JavascriptLanguageAdapter();
      const workspace = {
        directories: ["/test/workspace"],
        languages: [{ packages: ["package-a"] }],
      } as unknown as Workspace;
      const pkg = await adapter.loadPackage(
        workspace,
        "/test/workspace",
        "package-a"
      );
      expect(pkg.name).toBe("package-a");
    });

    it("should load a contrib package", async () => {
      vol.fromJSON({
        "/test/workspace/node_modules/@dotguides-contrib/package-b/config.json":
          "{}",
      });

      const adapter = new JavascriptLanguageAdapter();
      const workspace = {
        directories: ["/test/workspace"],
        languages: [{ packages: ["package-b"] }],
      } as unknown as Workspace;
      const pkg = await adapter.loadPackage(
        workspace,
        "/test/workspace",
        "package-b"
      );
      expect(pkg.name).toBe("package-b");
    });
  });

  describe("discoverContrib", () => {
    describe("with DOTGUIDES_CONTRIB", () => {
      const tests = [
        {
          desc: "should discover nothing if no packages match",
          packages: ["a", "b"],
          files: {},
          expected: [],
        },
        {
          desc: "should discover a single package",
          packages: ["a", "b"],
          files: {
            "/contrib/js/a/index.js": "",
          },
          expected: ["file:/contrib/js/a"],
        },
        {
          desc: "should discover a scoped package",
          packages: ["@foo/bar"],
          files: {
            "/contrib/js/foo__bar/index.js": "",
          },
          expected: ["file:/contrib/js/foo__bar"],
        },
      ];

      beforeEach(() => {
        process.env.DOTGUIDES_CONTRIB = "/contrib";
      });

      it.each(tests)("$desc", async ({ packages, files, expected }) => {
        vol.fromJSON(files);
        const adapter = new JavascriptLanguageAdapter();
        const result = await adapter.discoverContrib(packages);
        expect(result.sort()).toEqual(expected.sort());
      });
    });

    describe("with NPM registry", () => {
      const tests = [
        {
          desc: "should discover nothing if no packages match",
          packages: ["a", "b"],
          found: [],
          expected: [],
        },
        {
          desc: "should discover a single package",
          packages: ["a", "b"],
          found: ["a"],
          expected: ["a"],
        },
        {
          desc: "should discover a scoped package",
          packages: ["@foo/bar"],
          found: ["@foo/bar"],
          expected: ["@foo/bar"],
        },
      ];

      beforeEach(() => {
        delete process.env.DOTGUIDES_CONTRIB;
      });

      it.each(tests)("$desc", async ({ packages, found, expected }) => {
        vi.mocked(cachedFetch).mockImplementation(async (url) => {
          const pkg = url
            .toString()
            .replace("https://registry.npmjs.org/@dotguides-contrib/", "");
          const normalizedPkg =
            pkg.indexOf("__") > -1 ? `@${pkg.replace("__", "/")}` : pkg;
          if (found.includes(normalizedPkg)) {
            return new Response(null, { status: 200 });
          }
          return new Response(null, { status: 404 });
        });
        const adapter = new JavascriptLanguageAdapter();
        const result = await adapter.discoverContrib(packages);
        expect(result.sort()).toEqual(expected.sort());
      });
    });
  });
});
