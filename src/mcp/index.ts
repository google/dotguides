import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Workspace } from "../lib/workspace.js";
import { DotguidesMcp } from "./server.js";
import { Server } from "@modelcontextprotocol/sdk/server";

type McpServerOptions = {
  workspace: string[];
};

export async function startMcpServer(options: McpServerOptions) {
  return DotguidesMcp.start(options.workspace);
}
