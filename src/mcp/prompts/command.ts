import type {
  GetPromptResult,
  Prompt,
} from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "../../lib/package.js";
import type { Command } from "../../lib/command.js";
import type { RenderContext } from "../../lib/types.js";

import { McpError } from "@modelcontextprotocol/sdk/types.js";

export function commandToPrompt(pkg: Package, command: Command): Prompt {
  const prompt: Prompt = {
    name: `${pkg.name}:${command.config.name}`,
    description: command.config.description,
    arguments: command.arguments,
  };

  prompt.execute = async (
    args: Record<string, string>,
    context?: RenderContext["hints"]
  ): Promise<GetPromptResult> => {
    const renderContext = pkg.renderContext(context);
    const content = await command.render(renderContext, args);
    const textParts: string[] = [];
    for (const block of content) {
      if (block.type !== "text") {
        throw new McpError(
          400,
          `Command prompts can only contain text content.`
        );
      }
      textParts.push(block.text);
    }
    return {
      messages: [
        {
          role: "user",
          content: { type: "text", text: textParts.join() },
        },
      ],
    };
  };
  return prompt;
}
