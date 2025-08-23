import type {
  GetPromptResult,
  Prompt,
  PromptArgument,
} from "@modelcontextprotocol/sdk/types.js";
import type { Workspace } from "../lib/workspace.js";

export type PromptFn = (
  args: Record<string, string>,
  context: { workspace: Workspace }
) => Promise<GetPromptResult> | GetPromptResult;

export function prompt(
  options: {
    name: string;
    title?: string;
    description?: string;
    arguments: PromptArgument[];
  },
  fn: PromptFn
): {
  fn: PromptFn;
  mcp: Prompt;
} {
  return {
    fn: (args, context) => Promise.resolve(fn(args, context)),
    mcp: {
      name: options.name,
      arguments: options.arguments,
      description: options.description,
      title: options.title,
    },
  };
}
