import type { ContextBudget } from "../settings.js";

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
}
