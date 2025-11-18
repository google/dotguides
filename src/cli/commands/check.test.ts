import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkCommand } from "./check.js";
import { Package } from "../../lib/package.js";
import { allLanguages } from "../../lib/language.js";
import { vol } from "memfs";
import type { fs } from "memfs";

// Mock dependencies
vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

vi.mock("../../lib/package.js");
vi.mock("../../lib/language.js", async () => {
  return {
    allLanguages: [
      {
        discover: vi.fn().mockResolvedValue({
          detected: true,
          workspacePackage: {
            dir: "/test/package",
            name: "test-package",
          },
        }),
      },
    ],
  };
});

describe("checkCommand", () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    vol.reset();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    
    // Mock Package.load
    (Package.load as any).mockResolvedValue({
      name: "test-package",
      guides: [
        {
          config: { name: "usage" },
          render: vi.fn().mockResolvedValue([{ type: "text", text: "Usage content" }]),
        },
      ],
      docs: [],
      commands: [],
      getDocsList: vi.fn().mockReturnValue([]),
      systemInstructions: vi.fn().mockResolvedValue("System prompt"),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should output formatted token budget", async () => {
    vol.fromJSON({
      "/test/package/.guides/config.json": "{}",
    });

    // Mock process.cwd
    vi.spyOn(process, "cwd").mockReturnValue("/test/package");

    await checkCommand();

    // Verify console output contains color codes and formatted text
    const calls = consoleLogSpy.mock.calls.map((c: any) => c[0]).join("\n");
    
    // Check for bold/cyan/dim
    expect(calls).toContain("\x1b[1m"); // bold
    expect(calls).toContain("\x1b[36m"); // cyan
    
    // Check for budget table
    expect(calls).toContain("Usage:");
    expect(calls).toContain("Style:");
    expect(calls).toContain("Docs:");
    expect(calls).toContain("Clerical:");
    expect(calls).toContain("Total:");
    
    // Check for success message
    expect(calls).toContain("Budget check passed!");
  });
});
