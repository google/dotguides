import { startMcpServer } from "../../mcp/index.js";

export async function mcpCommand(workspace: string[] | undefined) {
  await startMcpServer({ workspace });
}
