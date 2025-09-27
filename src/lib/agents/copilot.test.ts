import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopilotAdapter } from "./copilot.js";
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

const { existsAny } = await import("../file-utils.js");
const { mkdir, writeFile, readFile } = await import("fs/promises");

describe("CopilotAdapter", () => {
  let adapter: CopilotAdapter;

  beforeEach(() => {
    adapter = new CopilotAdapter();
    vi.resetAllMocks();
  });

  describe("detect", () => {
    it("should return true if .github/copilot-instructions.md exists", async () => {
      (existsAny as any).mockResolvedValue(".github/copilot-instructions.md");
      const result = await adapter.detect("/fake/dir");
      expect(result).toBe(true);
      expect(existsAny).toHaveBeenCalledWith(
        "/fake/dir",
        ".github/copilot-instructions.md",
        ".github/instructions",
        ".vscode/mcp.json",
      );
    });

    it("should return false if no relevant files exist", async () => {
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

    it("should create instructions file and mcp.json", async () => {
      (readFile as any).mockRejectedValue({ code: "ENOENT" }); // No existing mcp.json

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const instructionsDir = join(workspaceDir, ".github", "instructions");
      expect(mkdir).toHaveBeenCalledWith(instructionsDir, { recursive: true });

      const expectedContent = `---
applyTo: "**"
---

${instructions}
`;
      expect(writeFile).toHaveBeenCalledWith(
        join(instructionsDir, "dotguides.instructions.md"),
        expectedContent,
      );

      const vscodeDir = join(workspaceDir, ".vscode");
      expect(mkdir).toHaveBeenCalledWith(vscodeDir, { recursive: true });

      const expectedMcpSettings = {
        servers: {
          test: { command: "foo", type: "stdio" },
        },
      };
      expect(writeFile).toHaveBeenCalledWith(
        join(vscodeDir, "mcp.json"),
        JSON.stringify(expectedMcpSettings, null, 2),
      );
    });

    it("should merge with existing mcp.json", async () => {
      const existingMcpSettings = {
        servers: {
          existing: { command: "bar", type: "stdio" },
        },
      };
      (readFile as any).mockResolvedValue(JSON.stringify(existingMcpSettings));

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const expectedMcpSettings = {
        servers: {
          existing: { command: "bar", type: "stdio" },
          test: { command: "foo", type: "stdio" },
        },
      };

      expect(writeFile).toHaveBeenCalledWith(
        join(workspaceDir, ".vscode", "mcp.json"),
        JSON.stringify(expectedMcpSettings, null, 2),
      );
    });

    it("should not overwrite existing server in mcp.json", async () => {
      const existingMcpSettings = {
        servers: {
          test: { command: "existing", type: "stdio" },
        },
      };
      (readFile as any).mockResolvedValue(JSON.stringify(existingMcpSettings));

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers,
        contextBudget,
      });

      const writtenContent = JSON.parse(
        (writeFile as any).mock.calls.find((c: any) =>
          c[0].endsWith("mcp.json"),
        )[1],
      );
      expect(writtenContent.servers.test.command).toBe("existing");
    });

    it("should set server type to http if url is provided", async () => {
      (readFile as any).mockRejectedValue({ code: "ENOENT" }); // No existing mcp.json
      const mcpServersWithUrl = { test: { url: "http://localhost:8080" } };

      await adapter.up(workspaceDir, {
        instructions,
        mcpServers: mcpServersWithUrl,
        contextBudget,
      });

      const expectedMcpSettings = {
        servers: {
          test: { url: "http://localhost:8080", type: "http" },
        },
      };

      const writtenContent = JSON.parse(
        (writeFile as any).mock.calls.find((c: any) =>
          c[0].endsWith("mcp.json"),
        )[1],
      );
      expect(writtenContent).toEqual(expectedMcpSettings);
    });
  });
});
