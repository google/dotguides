import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import type z from "zod";
import { toJSONSchema } from "zod";
import type { Workspace } from "../lib/workspace.js";

export type ToolFn<I> = (
  input: z.infer<I>,
  context: { workspace: Workspace }
) => Promise<CallToolResult> | CallToolResult;

export function tool<I extends z.ZodType>(
  options: {
    name: string;
    title?: string;
    description?: string;
    inputSchema: I;
  },
  fn: ToolFn<I>
): {
  fn: ToolFn<I>;
  mcp: Tool;
} {
  const inputSchema = toJSONSchema(options.inputSchema) as any;
  delete inputSchema["$schema"];
  return {
    fn: (input, context) => Promise.resolve(fn(input, context)),
    mcp: {
      name: options.name,
      inputSchema,
      description: options.description,
      title: options.title,
    },
  };
}
