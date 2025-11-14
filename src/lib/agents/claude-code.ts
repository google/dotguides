import type { AgentAdapter } from "./types.js";
import { promises as fs } from "fs";
import path from "path";
import { log } from "@clack/prompts";
import type { ContextBudget } from "../settings.js";
import { mergeMcpServers } from "./utils.js";
import { readJsonFile, writeJsonFile } from "../file-utils.js";
import { Package } from "../package.js";

interface ClaudeSettings {
  hooks?: {
    SessionStart?: any[];
  };
}

async function configureClaudeCodeHook(workspaceDir: string) {
  const settingsPath = path.join(workspaceDir, ".claude", "settings.json");
  const settings = await readJsonFile<ClaudeSettings>(settingsPath, {});

  if (!settings.hooks) {
    settings.hooks = {};
  }

  if (!settings.hooks.SessionStart) {
    settings.hooks.SessionStart = [];
  }

  const hook = {
    hooks: [
      {
        type: "command",
        command: "dotguides hook --agent claude-code",
        description: "Provides dynamic system instructions from dotguides.",
      },
    ],
  };

  const existingHookIndex = settings.hooks.SessionStart.findIndex(
    (h: any) =>
      h.hooks?.[0]?.description ===
      "Provides dynamic system instructions from dotguides.",
  );

  if (existingHookIndex !== -1) {
    settings.hooks.SessionStart[existingHookIndex] = hook;
  } else {
    settings.hooks.SessionStart.push(hook);
  }

  await writeJsonFile(settingsPath, settings);
  log.success("Claude Code hook configured successfully.");
}

export class ClaudeCodeAdapter implements AgentAdapter {
  name = "claude-code";
  title = "Claude Code";

  async detect(workspaceDir: string): Promise<boolean> {
    try {
      await fs.access(path.join(workspaceDir, ".claude"));
      return true;
    } catch (e) {
      return false;
    }
  }

  async up(
    workspaceDir: string,
    config: {
      instructions: string;
      mcpServers: { [key: string]: any };
      contextBudget: ContextBudget;
    },
  ): Promise<void> {
    await configureClaudeCodeHook(workspaceDir);

    const mcpConfigPath = path.join(workspaceDir, ".mcp.json");
    const existing = await readJsonFile<{ mcpServers: Record<string, any> }>(
      mcpConfigPath,
      { mcpServers: {} },
    );
    const mcpServers = mergeMcpServers(
      existing.mcpServers || {},
      config.mcpServers,
    );
    await writeJsonFile(mcpConfigPath, { mcpServers });

    if (Object.keys(mcpServers).length > 0) {
      const settingsPath = path.join(
        workspaceDir,
        ".claude",
        "settings.local.json",
      );
      const settings = await readJsonFile<Record<string, any>>(
        settingsPath,
        {},
      );
      settings.enableAllProjectMcpServers = true;
      await writeJsonFile(settingsPath, settings);
    }

    log.success("MCP servers configured successfully for Claude Code.");
  }

  async hook(
    instructions: string,
    enabledPackages: Package[],
  ): Promise<string> {
    const packageNames = enabledPackages.map((p) => p.name).join(", ");
    const systemMessage = `Dotguides is ready, active packages: ${packageNames}`;
    const output = {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: instructions,
      },
      systemMessage: systemMessage,
      suppressOutput: true,
    };
    return JSON.stringify(output, null, 2);
  }
}
