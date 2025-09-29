import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiCliAdapter } from "./gemini-cli.js";
import { join } from "path";

// Mock file-utils
vi.mock("../file-utils.js", () => ({
  existsAny: vi.fn(),
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
}));

const { existsAny, readJsonFile, writeJsonFile } = await import(
  "../file-utils.js"
);
const { writeFile } = await import("fs/promises");

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
      (readJsonFile as any).mockResolvedValue({}); // No existing settings

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      expect(writeFile).toHaveBeenCalledWith(
        join(workspaceDir, "DOTGUIDES.md"),
        instructions,
      );

      const expectedSettings = {
        context: {
          fileName: ["GEMINI.md", "DOTGUIDES.md"],
        },
        mcpServers: {
          test: { command: "foo" },
        },
      };

      expect(writeJsonFile).toHaveBeenCalledWith(
        join(workspaceDir, ".gemini", "settings.json"),
        expectedSettings,
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
      (readJsonFile as any).mockResolvedValue(existingSettings);

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

      expect(writeJsonFile).toHaveBeenCalledWith(
        join(workspaceDir, ".gemini", "settings.json"),
        expectedSettings,
      );
    });

    it("should not overwrite existing DOTGUIDES.md in context", async () => {
      const existingSettings = {
        context: {
          fileName: ["DOTGUIDES.md", "OTHER.md"],
        },
      };
      (readJsonFile as any).mockResolvedValue(existingSettings);

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const writtenConfig = (writeJsonFile as any).mock.calls[0][1];

      expect(writtenConfig.context.fileName).toEqual([
        "DOTGUIDES.md",
        "OTHER.md",
      ]);
    });
  });
});
