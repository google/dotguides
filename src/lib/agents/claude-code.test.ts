import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeCodeAdapter } from "./claude-code.js";
import { join } from "path";

// Mock file-utils
vi.mock("../file-utils.js", () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  access: vi.fn(),
}));

// Mock @clack/prompts
vi.mock("@clack/prompts", () => ({
  log: {
    success: vi.fn(),
  },
}));

const { readJsonFile, writeJsonFile } = await import("../file-utils.js");

describe("ClaudeCodeAdapter", () => {
  let adapter: ClaudeCodeAdapter;

  beforeEach(() => {
    adapter = new ClaudeCodeAdapter();
    vi.resetAllMocks();
  });

  describe("up", () => {
    const workspaceDir = "/fake/dir";
    const instructions = "Do the thing";
    const contextBudget = "medium";

    it("should configure MCP servers and enable them in settings.local.json", async () => {
      const mcpServers = { test: { command: "foo" } };
      
      // Sequence of readJsonFile calls:
      // 1. settings.json (inside configureClaudeCodeHook)
      // 2. .mcp.json (inside up)
      // 3. settings.local.json (inside up, inside if block)
      (readJsonFile as any)
        .mockResolvedValueOnce({}) // settings.json
        .mockResolvedValueOnce({ mcpServers: {} }) // .mcp.json
        .mockResolvedValueOnce({}); // settings.local.json

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      // Verify settings.json write
      const settingsPath = join(workspaceDir, ".claude", "settings.json");
      expect(writeJsonFile).toHaveBeenCalledWith(settingsPath, expect.objectContaining({
         hooks: expect.anything()
      }));

      // Verify .mcp.json write
      const mcpConfigPath = join(workspaceDir, ".mcp.json");
      expect(writeJsonFile).toHaveBeenCalledWith(mcpConfigPath, {
        mcpServers: expect.objectContaining({
          test: expect.objectContaining({ command: "foo" }),
        }),
      });

      // Verify settings.local.json write
      const settingsLocalPath = join(workspaceDir, ".claude", "settings.local.json");
      expect(writeJsonFile).toHaveBeenCalledWith(settingsLocalPath, {
        enableAllProjectMcpServers: true,
      });
    });

    it("should not modify settings.local.json if no MCP servers are configured", async () => {
      const mcpServers = {};
      
      // Mock readJsonFile for settings.json
      (readJsonFile as any).mockResolvedValueOnce({}); 
      // Mock readJsonFile for .mcp.json
      (readJsonFile as any).mockResolvedValueOnce({ mcpServers: {} });

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const settingsLocalPath = join(workspaceDir, ".claude", "settings.local.json");
      // Check that writeJsonFile was NOT called for settings.local.json
      // The calls we expect:
      // 1. settings.json
      // 2. .mcp.json
      
      const calls = (writeJsonFile as any).mock.calls;
      const wroteLocalSettings = calls.some((call: any[]) => 
        call[0].endsWith("settings.local.json")
      );
      
      expect(wroteLocalSettings).toBe(false);
    });

    it("should preserve existing settings in settings.local.json", async () => {
      const mcpServers = { test: { command: "foo" } };
      
      (readJsonFile as any)
        .mockResolvedValueOnce({}) // settings.json
        .mockResolvedValueOnce({ mcpServers: {} }) // .mcp.json
        .mockResolvedValueOnce({ otherSetting: "value" }); // settings.local.json

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const settingsLocalPath = join(workspaceDir, ".claude", "settings.local.json");
      expect(writeJsonFile).toHaveBeenCalledWith(settingsLocalPath, {
        otherSetting: "value",
        enableAllProjectMcpServers: true,
      });
    });
  });
});
