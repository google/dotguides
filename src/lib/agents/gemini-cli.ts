import type { AgentAdapter } from "./types.js";
import { writeFile } from "fs/promises";
import { join } from "path";
import { type ContextBudget } from "../settings.js";
import { existsAny, readJsonFile, writeJsonFile } from "../file-utils.js";
import { mergeMcpServers } from "./utils.js";

interface GeminiSettings {
  context?: {
    fileName?: string | string[];
  };
  mcpServers?: Record<string, any>;
}

export class GeminiCliAdapter implements AgentAdapter {
  get name(): string {
    return "gemini-cli";
  }

  get title(): string {
    return "Gemini CLI";
  }

  async detect(workspaceDir: string): Promise<boolean> {
    return !!(await existsAny(workspaceDir, "GEMINI.md", ".gemini"));
  }

  async up(
    workspaceDir: string,
    config: {
      instructions: string;
      mcpServers: { [key: string]: any };
      contextBudget: ContextBudget;
    },
  ): Promise<void> {
    await writeFile(join(workspaceDir, "DOTGUIDES.md"), config.instructions);

    const geminiDir = join(workspaceDir, ".gemini");
    const geminiSettingsPath = join(geminiDir, "settings.json");

    const geminiSettings = await readJsonFile<GeminiSettings>(
      geminiSettingsPath,
      {},
    );

    geminiSettings.context ??= {};
    if (!geminiSettings.context.fileName) {
      geminiSettings.context.fileName = ["GEMINI.md", "DOTGUIDES.md"];
    } else {
      const filenames = Array.isArray(geminiSettings.context.fileName)
        ? geminiSettings.context.fileName
        : [geminiSettings.context.fileName];
      if (!filenames.includes("DOTGUIDES.md")) {
        filenames.push("DOTGUIDES.md");
      }
      geminiSettings.context.fileName = filenames;
    }

    geminiSettings.mcpServers = mergeMcpServers(
      geminiSettings.mcpServers ?? {},
      config.mcpServers,
    );

    console.log(
      "WRITING",
      geminiSettingsPath,
      JSON.stringify(geminiSettings, null, 2),
    );
    await writeJsonFile(geminiSettingsPath, geminiSettings);
  }
}
