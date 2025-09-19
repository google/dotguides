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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";

function _render(obj: Record<string, any>, indent: string = ""): string {
  return Object.entries(obj)
    .map(([key, value]) => {
      if (value === undefined) {
        return null;
      }
      const prefix = `${indent}${key}:`;
      if (value === null) {
        return `${prefix} <none>`;
      }
      if (Array.isArray(value)) {
        return `${prefix} ${value.join(", ")}`;
      }
      if (typeof value === "object") {
        const nested = _render(value, indent + "  ");
        if (nested) {
          return `${prefix}\n${nested}`;
        }
        return `${prefix} {}`;
      }
      return `${prefix} ${value}`;
    })
    .filter((line) => line !== null)
    .join("\n");
}

export function renderDetails(obj: Record<string, any>): string {
  return _render(obj);
}

export function section(
  options: {
    name: string;
    attrs?: Record<string, string | undefined>;
    condition?: any;
  },
  content: string | string[] | undefined | null
) {
  if (options.condition === false || !content) return "";
  if (Array.isArray(content)) content = content.join("\n");
  return `<${options.name}${
    options.attrs
      ? " " +
        Object.entries(options.attrs)
          .map(([key, value]) => (value ? `${key}="${value}"` : ""))
          .join(" ")
      : ""
  }>\n${content.trim()}\n</${options.name}>`;
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  }
  if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}

export function countTokens(content: ContentBlock[]): number {
  return content.reduce((acc, block) => {
    if (block.type === "text" && typeof block.text === "string") {
      return acc + Math.round(block.text.length / 4);
    }
    if (block.type === "image") {
      return acc + 270;
    }
    return acc;
  }, 0);
}
