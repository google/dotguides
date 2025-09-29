import type { AgentAdapter } from "./types.js";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { existsAny } from "../file-utils.js";
import type { ContextBudget } from "../settings.js";

export class CursorAdapter implements AgentAdapter {
  get name(): string {
    return "cursor";
  }

  get title(): string {
    return "Cursor";
  }

  async detect(workspaceDir: string): Promise<boolean> {
    return !!(await existsAny(workspaceDir, ".cursor", ".cursorrules"));
  }

  async up(
    workspaceDir: string,
    config: {
      instructions: string;
      mcpServers: { [key: string]: any };
      contextBudget: ContextBudget;
    },
  ): Promise<void> {
    const cursorRulesDir = join(workspaceDir, ".cursor", "rules");
    await mkdir(cursorRulesDir, { recursive: true });

    const content = `---
description: Generated Dotguides package guidance
alwaysApply: true
---

${config.instructions}
`;

    await writeFile(join(cursorRulesDir, "dotguides.md"), content);

    const cursorDir = join(workspaceDir, ".cursor");
    const mcpPath = join(cursorDir, "mcp.json");
    let mcpSettings: any = {};
    try {
      mcpSettings = JSON.parse(await readFile(mcpPath, "utf-8"));
    } catch (e) {
      // file doesn't exist or is invalid json, start with empty settings
    }

    mcpSettings.mcpServers ??= {};
    for (const serverName in config.mcpServers) {
      if (!mcpSettings.mcpServers[serverName]) {
        mcpSettings.mcpServers[serverName] = config.mcpServers[serverName];
      }
    }

    await writeFile(mcpPath, JSON.stringify(mcpSettings, null, 2));
  }
}
