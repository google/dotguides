import type { AgentAdapter } from "./types.js";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { existsAny } from "../file-utils.js";
import type { ContextBudget } from "../settings.js";

export class CopilotAdapter implements AgentAdapter {
  get name(): string {
    return "copilot";
  }

  get title(): string {
    return "GitHub Copilot";
  }

  async detect(workspaceDir: string): Promise<boolean> {
    return !!(await existsAny(
      workspaceDir,
      ".github/copilot-instructions.md",
      ".github/instructions",
      ".vscode/mcp.json",
    ));
  }

  async up(
    workspaceDir: string,
    config: {
      instructions: string;
      mcpServers: { [key: string]: any };
      contextBudget: ContextBudget;
    },
  ): Promise<void> {
    const instructionsDir = join(workspaceDir, ".github", "instructions");
    await mkdir(instructionsDir, { recursive: true });

    const content = `---
applyTo: "**"
---

${config.instructions}
`;

    await writeFile(
      join(instructionsDir, "dotguides.instructions.md"),
      content,
    );

    const vscodeDir = join(workspaceDir, ".vscode");
    await mkdir(vscodeDir, { recursive: true });
    const mcpPath = join(vscodeDir, "mcp.json");
    let mcpSettings: any = {};
    try {
      mcpSettings = JSON.parse(await readFile(mcpPath, "utf-8"));
    } catch (e) {
      // file doesn't exist or is invalid json, start with empty settings
    }

    mcpSettings.servers ??= {};
    for (const serverName in config.mcpServers) {
      if (!mcpSettings.servers[serverName]) {
        const serverConfig = config.mcpServers[serverName];
        const type = serverConfig.url ? "http" : "stdio";
        mcpSettings.servers[serverName] = {
          ...serverConfig,
          type: type,
        };
      }
    }

    await writeFile(mcpPath, JSON.stringify(mcpSettings, null, 2));
  }
}
