import type { AgentAdapter } from "./types.js";
import { GeminiCliAdapter } from "./gemini-cli.js";
import { CursorAdapter } from "./cursor.js";
import { ClaudeCodeAdapter } from "./claude-code.js";
import { CopilotAdapter } from "./copilot.js";

export const ALL_AGENTS: AgentAdapter[] = [
  new GeminiCliAdapter(),
  new CursorAdapter(),
  new CopilotAdapter(),
  new ClaudeCodeAdapter(),
];

export function findAgent(name: string): AgentAdapter | null {
  return ALL_AGENTS.find((a) => a.name === name) || null;
}

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
