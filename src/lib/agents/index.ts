import type { AgentAdapter } from "./types.js";
import { GeminiCliAdapter } from "./gemini-cli.js";

export const ALL_AGENTS: AgentAdapter[] = [new GeminiCliAdapter()];

export async function detectAgent(
  workspaceDir: string,
): Promise<AgentAdapter | null> {
  for (const agent of ALL_AGENTS) {
    if (await agent.detect(workspaceDir)) {
      return agent;
    }
  }
  return null;
}
