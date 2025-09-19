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

import { extname, resolve } from "path";
import { readFile } from "fs/promises";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import { readAny } from "./file-utils.js";
import { cachedFetch } from "./cached-fetch.js";
import type { RenderContext } from "./types.js";
import { MarkdownFile } from "./markdown-file.js";
import { PromptFile } from "./prompt-file.js";
import type { Package } from "./package.js";

export type ContentFileSource =
  | { path: string }
  | { url: string; contentType?: string };

export interface ContentFile {
  readonly source: ContentFileSource;
  readonly frontmatter: Record<string, any>;
  readonly pkg: Package;
  render(
    context?: RenderContext,
    args?: Record<string, any>
  ): Promise<ContentBlock[]>;
}

export async function loadContentFileText(
  rootDir: string,
  source: ContentFileSource
): Promise<string> {
  if ("path" in source) {
    return await readFile(resolve(rootDir, source.path), { encoding: "utf8" });
  } else {
    const response = await cachedFetch(source.url);
    return response.text();
  }
}

export async function loadContentFile(
  pkg: Package,
  source: ContentFileSource
): Promise<ContentFile> {
  let isPrompt = false;
  if ("path" in source) {
    isPrompt = extname(source.path) === ".prompt";
  } else {
    const url = new URL(source.url);
    isPrompt =
      url.pathname.endsWith(".prompt") ||
      source.contentType === "text/x-dotprompt";
  }

  if (isPrompt) {
    return PromptFile.load(pkg, source);
  }
  return MarkdownFile.load(pkg, source);
}
