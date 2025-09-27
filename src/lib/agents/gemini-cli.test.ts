import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiCliAdapter } from "./gemini-cli.js";
import { join } from "path";

// Mock file-utils
vi.mock("../file-utils.js", () => ({
  existsAny: vi.fn(),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
}));

// Mock settings
vi.mock("../settings.js", () => ({
  readSettings: vi.fn(),
}));

const { existsAny } = await import("../file-utils.js");
const { mkdir, writeFile, readFile } = await import("fs/promises");
const { readSettings } = await import("../settings.js");

describe("GeminiCliAdapter", () => {
  let adapter: GeminiCliAdapter;

  beforeEach(() => {
    adapter = new GeminiCliAdapter();
    vi.resetAllMocks();
  });

  describe("detect", () => {
    it("should return true if GEMINI.md exists", async () => {
      (existsAny as any).mockResolvedValue("GEMINI.md");
      const result = await adapter.detect("/fake/dir");
      expect(result).toBe(true);
      expect(existsAny).toHaveBeenCalledWith(
        "/fake/dir",
        "GEMINI.md",
        ".gemini",
      );
    });

    it("should return true if .gemini directory exists", async () => {
      (existsAny as any).mockResolvedValue(".gemini");
      const result = await adapter.detect("/fake/dir");
      expect(result).toBe(true);
    });

    it("should return false if neither GEMINI.md nor .gemini directory exists", async () => {
      (existsAny as any).mockResolvedValue(null);
      const result = await adapter.detect("/fake/dir");
      expect(result).toBe(false);
    });
  });

  describe("up", () => {
    const workspaceDir = "/fake/dir";
    const instructions = "Do the thing";
    const mcpServers = { test: { command: "foo" } };
    const contextBudget = "medium";

    it("should write instructions and update settings", async () => {
      (readFile as any).mockRejectedValue({ code: "ENOENT" }); // No existing settings
      (readSettings as any).mockResolvedValue({});

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      expect(writeFile).toHaveBeenCalledWith(
        join(workspaceDir, "DOTGUIDES.md"),
        instructions,
      );

      expect(mkdir).toHaveBeenCalledWith(join(workspaceDir, ".gemini"), {
        recursive: true,
      });

      const expectedSettings = {
        context: {
          fileName: ["GEMINI.md", "DOTGUIDES.md"],
        },
        mcpServers: {
          test: { command: "foo" },
        },
      };

      expect(writeFile).toHaveBeenCalledWith(
        join(workspaceDir, ".gemini", "settings.json"),
        JSON.stringify(expectedSettings, null, 2),
      );
    });

    it("should merge with existing settings", async () => {
      const existingSettings = {
        context: {
          fileName: "EXISTING.md",
        },
        mcpServers: {
          existing: { command: "bar" },
        },
      };
      (readFile as any).mockResolvedValue(JSON.stringify(existingSettings));
      (readSettings as any).mockResolvedValue({});

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const expectedSettings = {
        context: {
          fileName: ["EXISTING.md", "DOTGUIDES.md"],
        },
        mcpServers: {
          existing: { command: "bar" },
          test: { command: "foo" },
        },
      };

      expect(writeFile).toHaveBeenCalledWith(
        join(workspaceDir, ".gemini", "settings.json"),
        JSON.stringify(expectedSettings, null, 2),
      );
    });

    it("should not overwrite existing DOTGUIDES.md in context", async () => {
      const existingSettings = {
        context: {
          fileName: ["DOTGUIDES.md", "OTHER.md"],
        },
      };
      (readFile as any).mockResolvedValue(JSON.stringify(existingSettings));
      (readSettings as any).mockResolvedValue({});

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const writtenConfig = JSON.parse(
        (writeFile as any).mock.calls.find((c: [string, string]) =>
          c[0].endsWith("settings.json"),
        )[1],
      );

      expect(writtenConfig.context.fileName).toEqual([
        "DOTGUIDES.md",
        "OTHER.md",
      ]);
    });

    it("should not add mcp server if already in global settings", async () => {
      (readFile as any).mockRejectedValue({ code: "ENOENT" }); // No existing settings
      (readSettings as any).mockResolvedValue({
        mcpServers: { test: { command: "global" } },
      });

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const writtenConfig = JSON.parse(
        (writeFile as any).mock.calls.find((c: [string, string]) =>
          c[0].endsWith("settings.json"),
        )[1],
      );

      expect(writtenConfig.mcpServers).toEqual({});
    });
  });
});
