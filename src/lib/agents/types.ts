import type { ContextBudget } from "../settings.js";
import { Package } from "../package.js";

export interface AgentAdapter {
  name: string;
  title: string;
  detect(workspaceDir: string): Promise<boolean>;
  up(
    workspaceDir: string,
    config: {
      instructions: string;
      mcpServers: { [key: string]: any };
      contextBudget: ContextBudget;
    },
  ): Promise<void>;
  hook?(instructions: string, enabledPackages: Package[]): Promise<string>;
}
