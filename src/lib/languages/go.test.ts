import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoLanguageAdapter } from "./go.js";
import { vol } from "memfs";
import { exec } from "child_process";

vi.mock("fs/promises", async () => {
  const memfs = await vi.importActual<typeof import("memfs")>("memfs");
  return memfs.fs.promises;
});

vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

describe("GoLanguageAdapter", () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  describe("discover", () => {
    it("should return detected: false if go.mod does not exist", async () => {
      const adapter = new GoLanguageAdapter();
      const context = await adapter.discover("/test-project");
      expect(context.detected).toBe(false);
    });

    it("should detect a go project with a go.mod file", async () => {
      vol.fromJSON({
        "/test-project/go.mod": "module my-project\ngo 1.18",
      });

      vi.mocked(exec).mockImplementation(((
        command: string,
        options: any,
        callback: (err: any, stdout: string, stderr: string) => void
      ) => {
        if (command.startsWith("go list -m -f")) {
          callback(null, "", "");
        }
      }) as any);

      const adapter = new GoLanguageAdapter();
      const context = await adapter.discover("/test-project");
      expect(context.detected).toBe(true);
      expect(context.name).toBe("go");
      expect(context.runtimeVersion).toBe("1.18");
      expect(context.workspacePackage).toEqual({
        name: "my-project",
        packageVersion: "unknown",
        dependencyVersion: "unknown",
        dir: "/test-project",
        guides: false,
      });
    });

    it("should discover dependencies with guides", async () => {
      vol.fromJSON({
        "/test-project/go.mod": "module my-project\ngo 1.18",
        "/go/pkg/mod/github.com/some/dep@v1.2.3/.guides/guide.md": "...",
      });

      const goListOutput = `
github.com/some/dep v1.2.3 /go/pkg/mod/github.com/some/dep@v1.2.3
github.com/another/dep v4.5.6 /go/pkg/mod/github.com/another/dep@v4.5.6
      `.trim();

      vi.mocked(exec).mockImplementation(((
        command: string,
        options: any,
        callback: (err: any, stdout: string, stderr: string) => void
      ) => {
        if (command.startsWith("go list -m -f")) {
          callback(null, goListOutput, "");
        }
      }) as any);

      const adapter = new GoLanguageAdapter();
      const context = await adapter.discover("/test-project");

      expect(context.packages).toHaveLength(2);
      const someDep = context.packages.find(
        (p) => p.name === "github.com/some/dep"
      );
      expect(someDep?.guides).toBe(true);
      const anotherDep = context.packages.find(
        (p) => p.name === "github.com/another/dep"
      );
      expect(anotherDep?.guides).toBe(false);
    });
  });

  describe("loadPackage", () => {
    it("should load a package with guides", async () => {
      vi.mocked(exec).mockImplementation(((
        command: string,
        options: any,
        callback: (err: any, stdout: string, stderr: string) => void
      ) => {
        const cb = callback || options;
        cb(null, "/go/pkg/mod/github.com/some/dep@v1.2.3", "");
      }) as any);

      vol.fromJSON({
        "/go/pkg/mod/github.com/some/dep@v1.2.3/.guides/guide.md": "Hello",
      });

      const adapter = new GoLanguageAdapter();
      const workspace = {
        directories: ["/test-project"],
        languages: [
          {
            name: "go",
            packages: [{ name: "github.com/some/dep" }],
          },
        ],
      } as any;
      const pkg = await adapter.loadPackage(
        workspace,
        "/test-project",
        "github.com/some/dep"
      );
      expect(pkg.name).toBe("github.com/some/dep");
    });
  });
});
