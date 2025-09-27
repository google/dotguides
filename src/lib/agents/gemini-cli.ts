import type { AgentAdapter } from "./types.js";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { readSettings } from "../settings.js";
import { existsAny } from "../file-utils.js";

export class GeminiCliAdapter implements AgentAdapter {
  name(): string {
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
    },
  ): Promise<void> {
    await writeFile(join(workspaceDir, "DOTGUIDES.md"), config.instructions);

    const geminiDir = join(workspaceDir, ".gemini");
    await mkdir(geminiDir, { recursive: true });
    const geminiSettingsPath = join(geminiDir, "settings.json");

    let geminiSettings: any = {};
    try {
      geminiSettings = JSON.parse(await readFile(geminiSettingsPath, "utf-8"));
    } catch (e) {
      // file doesn't exist or is invalid json, start with empty settings
    }

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

    const settings = await readSettings();
    geminiSettings.mcpServers ??= {};
    for (const serverName in config.mcpServers) {
      if (!settings.mcpServers || !settings.mcpServers[serverName]) {
        geminiSettings.mcpServers[serverName] = config.mcpServers[serverName];
      }
    }

    await writeFile(
      geminiSettingsPath,
      JSON.stringify(geminiSettings, null, 2),
    );
  }
}
