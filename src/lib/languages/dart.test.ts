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
        },
      },
      {
        desc: "should discover packages with guides using package_config.json",
        files: {
          "/test/workspace/pubspec.yaml": `
name: my_dart_app
dependencies:
  package_a: ^1.0.0
dev_dependencies:
  test: ^1.21.0
`,
          "/test/workspace/.dart_tool/package_config.json": `{
  "configVersion": 2,
  "packages": [
    {
      "name": "package_a",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/package_a-1.0.0",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    },
    {
      "name": "test",
      "rootUri": "file:///home/.pub-cache/hosted/pub.dev/test-1.21.0",
      "packageUri": "lib/",
      "languageVersion": "3.3"
    }
  ]
}`,
          "/home/.pub-cache/hosted/pub.dev/package_a-1.0.0/.guides/config.json": "{}",
          "/home/.pub-cache/hosted/pub.dev/dotguides_contrib_test-1.21.0/.guides/config.json": "{}",
        },
        expected: {
          detected: true,
          name: "dart",
          packageManager: "pub",
          runtime: "dart",
          packages: ["package_a", "test"],
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
          "/home/.pub-cache/hosted/pub.dev/dotguides_contrib_some_package-1.0.0/.guides/config.json": "{}",
        },
        expected: {
          detected: true,
          name: "dart",
          packageManager: "pub",
          runtime: "dart",
          packages: ["some_package"],
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
          packages: ["loudify"],
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
          "/home/.pub-cache/hosted/pub.dev/http-0.13.5/.guides/config.json": "{}",
          "/home/.pub-cache/hosted/pub.dev/dotguides_contrib_test-1.21.0/.guides/config.json": "{}",
        },
        expected: {
          detected: true,
          name: "dart",
          packageManager: "pub",
          runtime: "dart",
          runtimeVersion: ">=2.17.0 <4.0.0",
          packages: ["http", "test"],
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
        expect(context.packages.sort()).toEqual(expected.packages.sort());
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
        languages: [{ packages: ["http"] }],
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
        "/home/.pub-cache/hosted/pub.dev/dotguides_contrib_dio-5.3.2/.guides/config.json": "{}",
      });

      const adapter = new DartLanguageAdapter();
      const workspace = {
        directories: ["/test/workspace"],
        languages: [{ packages: ["dio"] }],
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
        languages: [{ packages: ["nonexistent"] }],
      } as unknown as Workspace;
      
      await expect(adapter.loadPackage(
        workspace,
        "/test/workspace",
        "nonexistent"
      )).rejects.toThrow("Could not find .dart_tool/package_config.json for package nonexistent");
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
        languages: [{ packages: ["loudify"] }],
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
        languages: [{ packages: ["nonexistent"] }],
      } as unknown as Workspace;
      
      await expect(adapter.loadPackage(
        workspace,
        "/test/workspace",
        "nonexistent"
      )).rejects.toThrow("Package nonexistent not found in package_config.json");
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
          expected: ["file:/contrib/dart/package_a", "file:/contrib/dart/package_c"],
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
      // Since no actual .guides directories exist in the test, packages array should be empty
      expect(context.packages).toEqual([]);
    });
  });
});
