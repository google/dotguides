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
import { z, toJSONSchema } from "zod";
import { read_docs } from "./tools/read_docs.js";
import { PROMPTS } from "./prompts/index.js";
import { commandToPrompt } from "./prompts/command.js";

const TOOLS = [read_docs];

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
      tools: TOOLS.map((t) => t.mcp),
    };
  }

  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    const t = TOOLS.find((t) => t.mcp.name === request.params.name);
    if (!t)
      throw new InvalidRequestError(
        `Tool '${request.params.name}' was not found.`
      );
    return t.fn(request.params.arguments || ({} as any), {
      workspace: this.workspace,
    });
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

  async readDoc(uri: string): Promise<ReadResourceResult> {
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
    const content = await doc.content;
    return {
      contents: [
        {
          uri,
          blob: content.map((c) => ("text" in c ? c.text : "")).join("\n"),
          mimeType: "text/plain",
        },
      ],
    };
  }

  async listPrompts(request: ListPromptsRequest): Promise<ListPromptsResult> {
    const prompts = PROMPTS.map((p) => p.mcp);
    for (const pkg of this.workspace.packages) {
      for (const command of pkg.commands) {
        prompts.push(commandToPrompt(pkg, command));
      }
    }
    return {
      prompts,
    };
  }

  async getPrompt(request: GetPromptRequest): Promise<GetPromptResult> {
    const staticPrompt = PROMPTS.find(
      (p) => p.mcp.name === request.params.name
    );
    if (staticPrompt) {
      return staticPrompt.fn(request.params.arguments || {}, {
        workspace: this.workspace,
      });
    }

    const [pkgName, commandName] = request.params.name.split(":");
    if (!pkgName || !commandName) {
      throw new InvalidRequestError(
        `Prompt '${request.params.name}' was not found.`
      );
    }
    const pkg = this.workspace.packageMap[pkgName];
    if (!pkg) {
      throw new InvalidRequestError(
        `Package '${pkgName}' not found for prompt '${request.params.name}'.`
      );
    }
    const command = pkg.commands.find((c) => c.config.name === commandName);
    if (!command) {
      throw new InvalidRequestError(
        `Command '${commandName}' not found for package '${pkgName}'.`
      );
    }
    const prompt = commandToPrompt(pkg, command);
    return (prompt as any).execute(request.params.arguments || {}, undefined);
  }

  start(transport: Transport = new StdioServerTransport()) {
    return this.server.connect(transport);
  }
}
