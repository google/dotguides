export interface AgentAdapter {
  name(): string;
  detect(workspaceDir: string): Promise<boolean>;
  up(
    workspaceDir: string,
    config: {
      instructions: string;
      mcpServers: { [key: string]: any };
    },
  ): Promise<void>;
}
