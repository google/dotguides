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
      expect(context.workspacePackage).toBeUndefined();
    });

    it("should return typescript if tsconfig.json is found", async () => {
      vol.fromJSON({
        "/test/workspace/tsconfig.json": "{}",
      });
      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");
      expect(context.name).toBe("typescript");
      expect(context.workspacePackage).toBeUndefined();
    });

    it("should return detected if package.json is found", async () => {
      vol.fromJSON({
        "/test/workspace/package.json": JSON.stringify({
          name: "test-workspace",
          version: "1.0.0",
        }),
      });
      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");
      expect(context.detected).toBe(true);
      expect(context.workspacePackage).toEqual({
        name: "test-workspace",
        packageVersion: "1.0.0",
        dependencyVersion: "1.0.0",
        dir: "/test/workspace",
        guides: false,
      });
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

    it("should discover packages and their properties correctly", async () => {
      vol.fromJSON({
        "/test/workspace/package.json": JSON.stringify({
          dependencies: {
            "package-a": "1.0.0",
          },
          devDependencies: {
            "package-b": "2.0.0",
          },
          optionalDependencies: {
            "package-c": "3.0.0",
          },
        }),
        "/test/workspace/node_modules/package-a/package.json": JSON.stringify({
          version: "1.0.0",
        }),
        "/test/workspace/node_modules/package-a/.guides/config.json": "{}", // Has guides
        "/test/workspace/node_modules/package-b/package.json": JSON.stringify({
          version: "2.0.0",
        }),
        // package-b does not have guides
        "/test/workspace/node_modules/package-c/package.json": JSON.stringify({
          version: "3.0.0",
        }),
        "/test/workspace/node_modules/@dotguides-contrib/package-c/config.json":
          "{}", // Has contrib guides
      });

      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");

      expect(context.packages).toHaveLength(3);
      const sortedPackages = [...context.packages].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      expect(sortedPackages).toEqual([
        {
          name: "package-a",
          dir: "/test/workspace/node_modules/package-a",
          dependencyVersion: "1.0.0",
          packageVersion: "1.0.0",
          guides: true,
          development: false,
          optional: false,
        },
        {
          name: "package-b",
          dir: "/test/workspace/node_modules/package-b",
          dependencyVersion: "2.0.0",
          packageVersion: "2.0.0",
          guides: false,
          development: true,
          optional: false,
        },
        {
          name: "package-c",
          dir: "/test/workspace/node_modules/package-c",
          dependencyVersion: "3.0.0",
          packageVersion: "3.0.0",
          guides: true,
          development: false,
          optional: true,
        },
      ]);
    });

    it("should sort packages by name and dependency order", async () => {
      vol.fromJSON({
        "/test/workspace/package.json": JSON.stringify({
          dependencies: {
            "react-markdown": "1.0.0",
            react: "18.0.0",
            "@scoped/pkg": "1.0.0",
            "another-lib": "1.0.0",
          },
        }),
        "/test/workspace/node_modules/react-markdown/package.json":
          JSON.stringify({
            version: "1.0.0",
            dependencies: {
              react: "18.0.0",
            },
          }),
        "/test/workspace/node_modules/react/package.json": JSON.stringify({
          version: "18.0.0",
        }),
        "/test/workspace/node_modules/@scoped/pkg/package.json": JSON.stringify(
          {
            version: "1.0.0",
          },
        ),
        "/test/workspace/node_modules/another-lib/package.json": JSON.stringify(
          {
            version: "1.0.0",
          },
        ),
      });

      const adapter = new JavascriptLanguageAdapter();
      const context = await adapter.discover("/test/workspace");

      expect(context.packages.map((p) => p.name)).toEqual([
        "another-lib",
        "react",
        "react-markdown",
        "@scoped/pkg",
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
        languages: [{ packages: [{ name: "package-a" }] }],
      } as unknown as Workspace;
      const pkg = await adapter.loadPackage(
        workspace,
        "/test/workspace",
        "package-a",
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
        languages: [{ packages: [{ name: "package-b" }] }],
      } as unknown as Workspace;
      const pkg = await adapter.loadPackage(
        workspace,
        "/test/workspace",
        "package-b",
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
