import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Workspace } from "../lib/workspace.js";
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type CallToolResult,
  type ClientCapabilities,
  type GetPromptRequest,
  type GetPromptResult,
  type ListPromptsRequest,
  type ListPromptsResult,
  type ListResourcesRequest,
  type ListResourcesResult,
  type ListToolsRequest,
  type ListToolsResult,
  type ReadResourceRequest,
  type ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

export class DotguidesMcp {
  server: Server;
  workspace: Workspace;
  clientCapabilities: Promise<ClientCapabilities>;
  initializedResolvers: (() => void)[] = [];

  static async start(workspaceDirs: string[]) {
    const ws = await Workspace.load(workspaceDirs);
    const server = new DotguidesMcp(ws);
    await server.start();
    return server;
  }

  initialized() {
    return new Promise<void>((resolve) => {
      this.initializedResolvers.push(resolve);
    });
  }

  constructor(workspace: Workspace) {
    this.server = new Server({
      name: "dotguides",
      version: "0.1.0",
      title: "Dotguides",
    });
    this.server.registerCapabilities({
      resources: {},
      tools: {},
      prompts: {},
      // logging: {},
    });

    let r: (clientCapabilities: ClientCapabilities) => void;
    this.clientCapabilities = new Promise<ClientCapabilities>((resolve) => {
      r = resolve;
    });
    this.server.oninitialized = () => {
      r(this.server.getClientCapabilities()!);
    };

    for (const [schema, method] of [
      [ListToolsRequestSchema, this.listTools],
      [CallToolRequestSchema, this.callTool],
      [ListResourcesRequestSchema, this.listResources],
      [ReadResourceRequestSchema, this.readResource],
      [ListPromptsRequestSchema, this.listPrompts],
      [GetPromptRequestSchema, this.getPrompt],
    ] as const) {
      this.server.setRequestHandler(schema, method.bind(this) as any);
    }
    this.workspace = workspace;
  }

  async listTools(request: ListToolsRequest): Promise<ListToolsResult> {
    return {
      tools: [],
    };
  }

  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    return {
      content: [],
    };
  }

  async listResources(
    request: ListResourcesRequest
  ): Promise<ListResourcesResult> {
    const resources: ListResourcesResult["resources"] = [];
    for (const pkg of this.workspace.packages) {
      for (const doc of pkg.docs) {
        resources.push({
          name: `${pkg.name}:${doc.config.name}`,
          uri: `docs:${pkg.name}:${doc.config.name}`,
          description: doc.description,
          title: `[${pkg.name}] ${doc.title}`,
          mimeType: "text/plain",
        });
      }
    }
    return {
      resources,
    };
  }

  async readResource(
    request: ReadResourceRequest
  ): Promise<ReadResourceResult> {
    if (request.params.uri.startsWith("docs:")) {
      return this.readDoc(request.params.uri);
    }
    return {
      contents: [],
    };
  }

  readDoc(uri: string): ReadResourceResult {
    const [_, pkg, name] = uri.split(":");
    if (!pkg || !name)
      throw new InvalidRequestError(
        `Docs URIs must be in doc:<package>:<name> format.`
      );
    if (!this.workspace.packageMap[pkg])
      throw new InvalidRequestError(`Package '${pkg}' not found in workspace.`);
    const doc = this.workspace.packageMap[pkg].doc(name);
    if (!doc)
      throw new InvalidRequestError(
        `Doc '${name}' not found for package '${pkg}'.`
      );
    return {
      contents: [
        {
          name: doc.config.name,
          uri,
          text: doc.content,
          mimeType: "text/plain",
        },
      ],
    };
  }

  async listPrompts(request: ListPromptsRequest): Promise<ListPromptsResult> {
    return {
      prompts: [],
    };
  }

  async getPrompt(request: GetPromptRequest): Promise<GetPromptResult> {
    return {
      messages: [],
    };
  }

  start(transport: Transport = new StdioServerTransport()) {
    return this.server.connect(transport);
  }
}
