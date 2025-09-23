/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
    context?: RenderContext["hints"],
  ): Promise<GetPromptResult> => {
    const renderContext = pkg.renderContext(context);
    const content = await command.render(renderContext, args);
    const textParts: string[] = [];
    for (const block of content) {
      if (block.type !== "text") {
        throw new McpError(
          400,
          `Command prompts can only contain text content.`,
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
