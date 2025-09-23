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

import { load } from "js-yaml";
import {
  loadContentFileText,
  type ContentFile,
  type ContentFileSource,
} from "./content-file.js";
import { resolve } from "path";
import type { RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

export class MarkdownFile implements ContentFile {
  readonly content: string;
  readonly frontmatter: Record<string, any>;
  readonly pkg: Package;

  private constructor(
    public source: ContentFileSource,
    pkg: Package,
    content: string,
  ) {
    this.pkg = pkg;
    const match = content.match(/^\s*---\r?\n(.*?)\r?\n---\r?\n/s);
    if (match && match[1]) {
      try {
        this.frontmatter = load(match[1]) || {};
      } catch (e) {
        console.error(e);
        this.frontmatter = {};
      }
      this.content = content.substring(match[0].length).trimStart();
    } else {
      this.frontmatter = {};
      this.content = content;
    }
  }

  static async load(
    pkg: Package,
    source: ContentFileSource,
  ): Promise<MarkdownFile> {
    const content = await loadContentFileText(pkg.guidesDir, source);
    const finalSource = { ...source };
    if ("path" in finalSource) {
      finalSource.path = resolve(pkg.guidesDir, finalSource.path);
    }
    return new MarkdownFile(finalSource, pkg, content);
  }

  async render(
    context: RenderContext,
    args?: Record<string, any>,
  ): Promise<ContentBlock[]> {
    if (args)
      throw new Error("Markdown files can't be rendered with arguments.");
    return [{ type: "text", text: this.content }];
  }
}
