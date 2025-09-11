import { describe, it, expect, vi, beforeEach } from "vitest";
import { DartLanguageAdapter } from "./dart.js";
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

describe("DartLanguageAdapter", () => {
  beforeEach(() => {
    vol.reset();
  });

  describe("discover", () => {
    const tests = [
      {
        desc: "should return not detected if pubspec.yaml is not found",
        files: {},
        expected: {
          detected: false,
          name: "dart",
          packages: [],
        },
      },
      {
        desc: "should return detected for basic Dart project",
        files: {
          "/test/workspace/pubspec.yaml": `
name: my_dart_app
version: 1.0.0
environment:
  sdk: '>=2.17.0 <4.0.0'
dependencies:
  http: ^0.13.5
`,
        },
        expected: {
          detected: true,
          name: "dart",
          packageManager: "pub",
          runtime: "dart",
          runtimeVersion: ">=2.17.0 <4.0.0",
          packages: [],
          workspacePackage: {
            name: "my_dart_app",
            packageVersion: "1.0.0",
            dependencyVersion: "1.0.0",
            dir: "/test/workspace",
            guides: false,
          },
        },
      },
      {
        desc: "should detect Flutter project",
        files: {
          "/test/workspace/pubspec.yaml": `
name: my_flutter_app
version: 1.0.0
environment:
  sdk: '>=2.17.0 <4.0.0'
  flutter: '>=3.0.0'
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
`,
        },
        expected: {
          detected: true,
          name: "flutter",
          packageManager: "pub",
          runtime: "flutter",
          runtimeVersion: ">=2.17.0 <4.0.0",
          packages: [],
          workspacePackage: {
            name: "my_flutter_app",
            packageVersion: "1.0.0",
            dependencyVersion: "1.0.0",
            dir: "/test/workspace",
            guides: false,
          },
        },
      },
      {
        desc: "should discover packages and their properties correctly",
        files: {
          "/test/workspace/pubspec.yaml": `
name: my_dart_app
dependencies:
  package_a: ^1.0.0
  package_b: ^2.0.0
dev_dependencies:
  test: ^1.21.0
`,
          "/test/workspace/pubspec.lock": `
packages:
  package_a:
    version: "1.0.0"
  package_b:
    version: "2.0.0"
  test:
    version: "1.21.0"
`,
          "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "package_a",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/package_a-1.0.0"
    },
    {
      "name": "package_b",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/package_b-2.0.0"
    },
    {
      "name": "test",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/test-1.21.0"
    }
  ]
}`,
          "/home/.pub-cache/hosted/pub.dev/package_a-1.0.0/.guides/config.json":
            "{}", // Has guides
          // package_b does not have guides
          "/home/.pub-cache/hosted/pub.dev/dotguides_contrib_test-1.21.0/.guides/config.json":
            "{}", // Has contrib guides
        },
        expected: {
          detected: true,
          name: "dart",
          packageManager: "pub",
          runtime: "dart",
          workspacePackage: {
            name: "my_dart_app",
            packageVersion: "0.0.0",
            dependencyVersion: "0.0.0",
            dir: "/test/workspace",
            guides: false,
          },
          packages: [
            {
              name: "package_a",
              dir: "/home/.pub-cache/hosted/pub.dev/package_a-1.0.0",
              dependencyVersion: "^1.0.0",
              packageVersion: "1.0.0",
              guides: true,
              development: false,
              optional: false,
            },
            {
              name: "package_b",
              dir: "/home/.pub-cache/hosted/pub.dev/package_b-2.0.0",
              dependencyVersion: "^2.0.0",
              packageVersion: "2.0.0",
              guides: false,
              development: false,
              optional: false,
            },
            {
              name: "test",
              dir: "/home/.pub-cache/hosted/pub.dev/test-1.21.0",
              dependencyVersion: "^1.21.0",
              packageVersion: "1.21.0",
              guides: true,
              development: true,
              optional: false,
            },
          ],
        },
      },
      {
        desc: "should handle scoped packages",
        files: {
          "/test/workspace/pubspec.yaml": `
name: my_dart_app
dependencies:
  some_package: ^1.0.0
`,
          "/test/workspace/pubspec.lock": `
packages:
  some_package:
    version: "1.0.0"
`,
          "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "some_package",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/some_package-1.0.0",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
          "/home/.pub-cache/hosted/pub.dev/dotguides_contrib_some_package-1.0.0/.guides/config.json":
            "{}",
        },
        expected: {
          detected: true,
          name: "dart",
          packageManager: "pub",
          runtime: "dart",
          workspacePackage: {
            name: "my_dart_app",
            packageVersion: "0.0.0",
            dependencyVersion: "0.0.0",
            dir: "/test/workspace",
            guides: false,
          },
          packages: [
            {
              name: "some_package",
              dir: "/home/.pub-cache/hosted/pub.dev/some_package-1.0.0",
              dependencyVersion: "^1.0.0",
              packageVersion: "1.0.0",
              guides: true,
              development: false,
              optional: false,
            },
          ],
        },
      },
      {
        desc: "should discover local path packages",
        files: {
          "/test/workspace/pubspec.yaml": `
name: my_dart_app
dependencies:
  loudify:
    path: /Users/sethladd/Code/loudify/loudify
`,
          "/test/workspace/pubspec.lock": `
packages:
  loudify:
    version: "1.0.0"
`,
          "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "loudify",
      "rootUri": "file:///Users/sethladd/Code/loudify/loudify",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
          "/Users/sethladd/Code/loudify/loudify/.guides/config.json": "{}",
        },
        expected: {
          detected: true,
          name: "dart",
          packageManager: "pub",
          runtime: "dart",
          workspacePackage: {
            name: "my_dart_app",
            packageVersion: "0.0.0",
            dependencyVersion: "0.0.0",
            dir: "/test/workspace",
            guides: false,
          },
          packages: [
            {
              name: "loudify",
              dir: "/Users/sethladd/Code/loudify/loudify",
              dependencyVersion: {
                path: "/Users/sethladd/Code/loudify/loudify",
              },
              packageVersion: "1.0.0",
              guides: true,
              development: false,
              optional: false,
            },
          ],
        },
      },
      {
        desc: "should parse dependencies correctly",
        files: {
          "/test/workspace/pubspec.yaml": `
name: my_app
version: 1.0.0

environment:
  sdk: '>=2.17.0 <4.0.0'

dependencies:
  http: ^0.13.5
  json_annotation: ^4.8.1
  
dev_dependencies:
  build_runner: ^2.4.6
  json_serializable: ^6.7.1
  test: ^1.21.0

dependency_overrides:
  meta: ^1.9.1
`,
          "/test/workspace/pubspec.lock": `
packages:
  http:
    version: "0.13.5"
  test:
    version: "1.21.0"
`,
          "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "http",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/http-0.13.5",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "json_annotation",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/json_annotation-4.8.1",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "build_runner",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/build_runner-2.4.6",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "json_serializable",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/json_serializable-6.7.1",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "test",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/test-1.21.0",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "meta",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/meta-1.9.1",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
          "/home/.pub-cache/hosted/pub.dev/http-0.13.5/.guides/config.json":
            "{}",
          "/home/.pub-cache/hosted/pub.dev/dotguides_contrib_test-1.21.0/.guides/config.json":
            "{}",
        },
        expected: {
          detected: true,
          name: "dart",
          packageManager: "pub",
          runtime: "dart",
          runtimeVersion: ">=2.17.0 <4.0.0",
          workspacePackage: {
            name: "my_app",
            packageVersion: "1.0.0",
            dependencyVersion: "1.0.0",
            dir: "/test/workspace",
            guides: false,
          },
          packages: [
            {
              name: "build_runner",
              dir: "/home/.pub-cache/hosted/pub.dev/build_runner-2.4.6",
              dependencyVersion: "^2.4.6",
              packageVersion: "unknown",
              guides: false,
              development: true,
              optional: false,
            },
            {
              name: "http",
              dir: "/home/.pub-cache/hosted/pub.dev/http-0.13.5",
              dependencyVersion: "^0.13.5",
              packageVersion: "0.13.5",
              guides: true,
              development: false,
              optional: false,
            },
            {
              name: "json_annotation",
              dir: "/home/.pub-cache/hosted/pub.dev/json_annotation-4.8.1",
              dependencyVersion: "^4.8.1",
              packageVersion: "unknown",
              guides: false,
              development: false,
              optional: false,
            },
            {
              name: "json_serializable",
              dir: "/home/.pub-cache/hosted/pub.dev/json_serializable-6.7.1",
              dependencyVersion: "^6.7.1",
              packageVersion: "unknown",
              guides: false,
              development: true,
              optional: false,
            },
            {
              name: "meta",
              dir: "/home/.pub-cache/hosted/pub.dev/meta-1.9.1",
              dependencyVersion: "any",
              packageVersion: "unknown",
              guides: false,
              development: false,
              optional: false,
            },
            {
              name: "test",
              dir: "/home/.pub-cache/hosted/pub.dev/test-1.21.0",
              dependencyVersion: "^1.21.0",
              packageVersion: "1.21.0",
              guides: true,
              development: true,
              optional: false,
            },
          ],
        },
      },
    ];

    it.each(tests)("$desc", async ({ files, expected }) => {
      vol.fromJSON(files);

      // Set HOME environment variable for tests that use pub cache
      const originalHome = process.env.HOME;
      process.env.HOME = "/home";

      try {
        const adapter = new DartLanguageAdapter();
        const context = await adapter.discover("/test/workspace");

        expect(context.detected).toBe(expected.detected);
        expect(context.name).toBe(expected.name);
        expect(context.packageManager).toBe(expected.packageManager);
        expect(context.runtime).toBe(expected.runtime);
        if (expected.runtimeVersion) {
          expect(context.runtimeVersion).toBe(expected.runtimeVersion);
        }
        const sortedPackages = context.packages.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        const sortedExpectedPackages = expected.packages.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        expect(sortedPackages).toEqual(sortedExpectedPackages);
        expect(context.workspacePackage).toEqual(expected.workspacePackage);
      } finally {
        // Restore original HOME environment variable
        if (originalHome !== undefined) {
          process.env.HOME = originalHome;
        } else {
          delete process.env.HOME;
        }
      }
    });
  });

  describe("loadPackage", () => {
    it("should load a package with guides from pub cache", async () => {
      vol.fromJSON({
        "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "http",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/http-0.13.5",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
        "/home/.pub-cache/hosted/pub.dev/http-0.13.5/.guides/config.json": "{}",
      });

      const adapter = new DartLanguageAdapter();
      const workspace = {
        directories: ["/test/workspace"],
        languages: [{ packages: [{ name: "http" }] }],
      } as unknown as Workspace;
      const pkg = await adapter.loadPackage(
        workspace,
        "/test/workspace",
        "http"
      );
      expect(pkg.name).toBe("http");
    });

    it("should load a contrib package from pub cache", async () => {
      vol.fromJSON({
        "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "dio",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/dio-5.3.2",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
        "/home/.pub-cache/hosted/pub.dev/dotguides_contrib_dio-5.3.2/.guides/config.json":
          "{}",
      });

      const adapter = new DartLanguageAdapter();
      const workspace = {
        directories: ["/test/workspace"],
        languages: [{ packages: [{ name: "dio" }] }],
      } as unknown as Workspace;
      const pkg = await adapter.loadPackage(
        workspace,
        "/test/workspace",
        "dio"
      );
      expect(pkg.name).toBe("dio");
    });

    it("should throw error if package_config.json not found", async () => {
      vol.fromJSON({});

      const adapter = new DartLanguageAdapter();
      const workspace = {
        directories: ["/test/workspace"],
        languages: [{ packages: [{ name: "nonexistent" }] }],
      } as unknown as Workspace;

      await expect(
        adapter.loadPackage(workspace, "/test/workspace", "nonexistent")
      ).rejects.toThrow(
        "Package nonexistent not found in .dart_tool/package_config.json"
      );
    });

    it("should load a local path package", async () => {
      vol.fromJSON({
        "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "loudify",
      "rootUri": "file:///Users/sethladd/Code/loudify/loudify",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
        "/Users/sethladd/Code/loudify/loudify/.guides/config.json": "{}",
      });

      const adapter = new DartLanguageAdapter();
      const workspace = {
        directories: ["/test/workspace"],
        languages: [{ packages: [{ name: "loudify" }] }],
      } as unknown as Workspace;
      const pkg = await adapter.loadPackage(
        workspace,
        "/test/workspace",
        "loudify"
      );
      expect(pkg.name).toBe("loudify");
    });

    it("should throw error if package not in package_config.json", async () => {
      vol.fromJSON({
        "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "other_package",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/other_package-1.0.0",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
      });

      const adapter = new DartLanguageAdapter();
      const workspace = {
        directories: ["/test/workspace"],
        languages: [{ packages: [{ name: "nonexistent" }] }],
      } as unknown as Workspace;

      await expect(
        adapter.loadPackage(workspace, "/test/workspace", "nonexistent")
      ).rejects.toThrow(
        "Package nonexistent not found in .dart_tool/package_config.json"
      );
    });
  });

  describe("discoverContrib", () => {
    describe("with DOTGUIDES_CONTRIB", () => {
      const tests = [
        {
          desc: "should discover nothing if no packages match",
          packages: ["package_a", "package_b"],
          files: {},
          expected: [],
        },
        {
          desc: "should discover a single package",
          packages: ["package_a", "package_b"],
          files: {
            "/contrib/dart/package_a/index.dart": "",
          },
          expected: ["file:/contrib/dart/package_a"],
        },
        {
          desc: "should discover multiple packages",
          packages: ["package_a", "package_b", "package_c"],
          files: {
            "/contrib/dart/package_a/index.dart": "",
            "/contrib/dart/package_c/index.dart": "",
          },
          expected: [
            "file:/contrib/dart/package_a",
            "file:/contrib/dart/package_c",
          ],
        },
      ];

      beforeEach(() => {
        process.env.DOTGUIDES_CONTRIB = "/contrib";
      });

      it.each(tests)("$desc", async ({ packages, files, expected }) => {
        vol.fromJSON(files);
        const adapter = new DartLanguageAdapter();
        const result = await adapter.discoverContrib(packages);
        expect(result.sort()).toEqual(expected.sort());
      });
    });

    describe("with pub.dev", () => {
      const tests = [
        {
          desc: "should discover nothing if no packages match",
          packages: ["package_a", "package_b"],
          found: [],
          expected: [],
        },
        {
          desc: "should discover a single package",
          packages: ["package_a", "package_b"],
          found: ["package_a"],
          expected: ["package_a"],
        },
        {
          desc: "should discover multiple packages",
          packages: ["package_a", "package_b", "package_c"],
          found: ["package_a", "package_c"],
          expected: ["package_a", "package_c"],
        },
      ];

      beforeEach(() => {
        delete process.env.DOTGUIDES_CONTRIB;
      });

      it.each(tests)("$desc", async ({ packages, found, expected }) => {
        vi.mocked(cachedFetch).mockImplementation(async (url) => {
          const pkg = url
            .toString()
            .replace("https://pub.dev/packages/dotguides_contrib_", "");
          if (found.includes(pkg)) {
            return new Response(null, { status: 200 });
          }
          return new Response(null, { status: 404 });
        });
        const adapter = new DartLanguageAdapter();
        const result = await adapter.discoverContrib(packages);
        expect(result.sort()).toEqual(expected.sort());
      });
    });
  });

  describe("package_config.json parsing", () => {
    it("should parse hosted and path dependencies from package_config.json", async () => {
      vol.fromJSON({
        "/test/workspace/pubspec.yaml": `
name: my_app
version: 1.0.0

environment:
  sdk: '>=2.17.0 <4.0.0'

dependencies:
  http: ^0.13.5
  json_annotation: ^4.8.1

dev_dependencies:
  test: ^1.21.0
`,
        "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "http",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/http-0.13.5",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "json_annotation",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/json_annotation-4.8.1",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "test",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/test-1.21.0",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "my_local_package",
      "rootUri": "file:///Users/sethladd/Code/my_local_package",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
      });

      const adapter = new DartLanguageAdapter();
      const context = await adapter.discover("/test/workspace");

      // The adapter should parse the package config correctly
      expect(context.detected).toBe(true);
      expect(context.runtimeVersion).toBe(">=2.17.0 <4.0.0");
      // Since we now discover all packages, this should not be empty
      expect(context.packages).not.toEqual([]);
      expect(context.packages.length).toBe(4);
    });
  });
});
