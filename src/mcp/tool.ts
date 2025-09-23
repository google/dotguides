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

import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import type z from "zod";
import { toJSONSchema } from "zod";
import type { Workspace } from "../lib/workspace.js";

export type ToolFn<I> = (
  input: z.infer<I>,
  context: { workspace: Workspace },
) => Promise<CallToolResult> | CallToolResult;

export function tool<I extends z.ZodType>(
  options: {
    name: string;
    title?: string;
    description?: string;
    inputSchema: I;
  },
  fn: ToolFn<I>,
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
