import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoLanguageAdapter } from "./go.js";
import { vol } from "memfs";
import { spawn } from "child_process";
import { EventEmitter } from "events";

vi.mock("fs/promises", async () => {
  const memfs = await vi.importActual<typeof import("memfs")>("memfs");
  return memfs.fs.promises;
});

vi.mock("child_process", () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}));

function mockSpawn(stdout: string, stderr = "", exitCode = 0) {
  const mockChild = new EventEmitter() as any;
  mockChild.stdout = new EventEmitter();
  mockChild.stderr = new EventEmitter();
  vi.mocked(spawn).mockReturnValue(mockChild);

  // Defer emitting events to allow promise to be created
  setTimeout(() => {
    if (stdout) mockChild.stdout.emit("data", stdout);
    if (stderr) mockChild.stderr.emit("data", stderr);
    mockChild.emit("close", exitCode);
  }, 0);
}

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

      mockSpawn(""); // for go list

      const adapter = new GoLanguageAdapter();
      const context = await adapter.discover("/test-project");
      // We need to wait for the async operations in discover to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
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

      mockSpawn(goListOutput);

      const adapter = new GoLanguageAdapter();
      const context = await adapter.discover("/test-project");
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(context.packages).toHaveLength(2);
      const someDep = context.packages.find(
        (p) => p.name === "github.com/some/dep",
      );
      expect(someDep?.guides).toBe(true);
      const anotherDep = context.packages.find(
        (p) => p.name === "github.com/another/dep",
      );
      expect(anotherDep?.guides).toBe(false);
    });
  });

  describe("loadPackage", () => {
    it("should load a package with guides", async () => {
      mockSpawn("/go/pkg/mod/github.com/some/dep@v1.2.3");

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
        "github.com/some/dep",
      );
      expect(pkg.name).toBe("github.com/some/dep");
    });
  });
});
