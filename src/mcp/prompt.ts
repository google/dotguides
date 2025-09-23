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
  PromptArgument,
} from "@modelcontextprotocol/sdk/types.js";
import type { Workspace } from "../lib/workspace.js";

export type PromptFn = (
  args: Record<string, string>,
  context: { workspace: Workspace },
) => Promise<GetPromptResult> | GetPromptResult;

export function prompt(
  options: {
    name: string;
    title?: string;
    description?: string;
    arguments: PromptArgument[];
  },
  fn: PromptFn,
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
