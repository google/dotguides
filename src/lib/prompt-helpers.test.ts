import { describe, it, expect, vi, beforeEach } from "vitest";
import { packageHelpers } from "./prompt-helpers.js";
import type { Package } from "./package.js";
import { vol } from "memfs";
import { resolve } from "path";

vi.mock("fs", () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("memfs").fs;
});

describe("packageHelpers", () => {
  beforeEach(() => {
    vol.reset();
  });

  describe("packageFile", () => {
    const mockPackage = {
      name: "test-package",
      dir: "/workspace/node_modules/test-package",
      workspace: {
        directories: ["/workspace"],
        languages: [
          {
            name: "javascript",
            packages: [
              {
                name: "test-package",
                dir: "/workspace/node_modules/test-package",
                packageVersion: "1.0.0",
                dependencyVersion: "1.0.0",
                guides: true,
              },
            ],
          },
        ],
      },
    } as unknown as Package;

    it("should return file contents if found", () => {
      vol.fromJSON({
        "/workspace/node_modules/test-package/test-file.txt": "hello world",
      });

      const helpers = packageHelpers(mockPackage);
      if (!helpers?.packageFile) {
        throw new Error("packageFile helper not found");
      }
      const result = helpers.packageFile("test-file.txt");
      const expectedPath = resolve(
        "/workspace/node_modules/test-package/test-file.txt"
      );
      expect(result).toEqual(`<file path="${expectedPath}">
\`\`\`txt
hello world
\`\`\`
</file>`);
    });

    it("should return an error if file not found", () => {
      vol.fromJSON({});
      const helpers = packageHelpers(mockPackage);
      if (!helpers?.packageFile) {
        throw new Error("packageFile helper not found");
      }
      const result = helpers.packageFile("non-existent-file.txt");
      const expectedPath = resolve(
        "/workspace/node_modules/test-package/non-existent-file.txt"
      );
      expect(result).toEqual(
        `<file path="${expectedPath}" error="FILE_NOT_FOUND"/>`
      );
    });
  });

  describe("workspaceFile", () => {
    const mockPackage = {
      name: "test-package",
      workspace: {
        directories: ["/workspace1", "/workspace2"],
      },
    } as unknown as Package;

    it("should return file contents if found in workspace", () => {
      vol.fromJSON({
        "/workspace2/test-file.txt": "hello from workspace 2",
      });
      const helpers = packageHelpers(mockPackage);
      if (!helpers?.workspaceFile) {
        throw new Error("workspaceFile helper not found");
      }
      const result = helpers.workspaceFile("test-file.txt");
      const expectedPath = resolve("/workspace2/test-file.txt");
      expect(result).toEqual(`<file path="${expectedPath}">
\`\`\`txt
hello from workspace 2
\`\`\`
</file>`);
    });

    it("should return an error if file not found in workspace", () => {
      const helpers = packageHelpers(mockPackage);
      if (!helpers?.workspaceFile) {
        throw new Error("workspaceFile helper not found");
      }
      const result = helpers.workspaceFile("non-existent-file.txt");
      expect(result).toEqual(`<file path="" error="FILE_NOT_FOUND"/>`);
    });
  });

  describe("hasDependency", () => {
    const mockPackage = {
      name: "test-package",
      workspace: {
        languages: [
          {
            name: "javascript",
            packages: [
              {
                name: "test-package",
                packageVersion: "1.0.0",
                dependencyVersion: "1.0.0",
                guides: true,
              },
              {
                name: "dep1",
                packageVersion: "1.2.3",
                dependencyVersion: "^1.2.0",
                guides: false,
              },
            ],
          },
        ],
      },
    } as unknown as Package;

    const tests = [
      {
        desc: "should return true if a dependency exists",
        input: { packageName: "dep1" },
        expect: "true",
      },
      {
        desc: "should return false if a dependency does not exist",
        input: { packageName: "dep2" },
        expect: "false",
      },
      {
        desc: "should return true if a dependency exists with a matching semver",
        input: { packageName: "dep1", range: "^1.0.0" },
        expect: "true",
      },
      {
        desc: "should return false if a dependency exists but with a non-matching semver",
        input: { packageName: "dep1", range: "^2.0.0" },
        expect: "false",
      },
    ];

    for (const test of tests) {
      it(test.desc, () => {
        const helpers = packageHelpers(mockPackage);
        if (!helpers?.hasDependency) {
          throw new Error("hasDependency helper not found");
        }
        const result = helpers.hasDependency(
          test.input.packageName,
          test.input.range
        );
        expect(result).toEqual(test.expect);
      });
    }
  });

  describe("runCommand", () => {
    const tests = [
      {
        desc: "should return the output of a successful command",
        input: "echo 'hello world'",
        expect: `<shell command="echo 'hello world'" exit_code="0">
\`\`\`
hello world
\`\`\`
</shell>`,
      },
      {
        desc: "should return the output of a failing command",
        input: "not-a-real-command",
        expect: /<shell command="not-a-real-command" exit_code="1">/,
      },
    ];

    for (const test of tests) {
      it(test.desc, () => {
        const helpers = packageHelpers({} as Package);
        if (!helpers?.runCommand) {
          throw new Error("runCommand helper not found");
        }
        const result = helpers.runCommand(test.input);
        if (test.expect instanceof RegExp) {
          const normalized = result.replace(/exit_code="\d+"/, `exit_code="1"`);
          expect(normalized).toMatch(test.expect);
        } else {
          expect(result).toEqual(test.expect);
        }
      });
    }
  });
});
