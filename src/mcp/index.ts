import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Workspace } from "../lib/workspace.js";
import { DotguidesMcp } from "./server.js";

type McpServerOptions = {
  workspace: string[] | undefined;
};

export async function startMcpServer(options: McpServerOptions) {
  const server = new McpServer({
    name: "dotguides",
    version: "1.0.0",
  });

  const workspaceDirs = options.workspace || [process.cwd()];

  const workspace = new Workspace(workspaceDirs);
  const dotguides = new DotguidesMcp(workspace);
  await dotguides.discover();

  await dotguides.register(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
