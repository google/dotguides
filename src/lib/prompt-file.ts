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

import { Dotprompt, type ParsedPrompt } from "dotprompt";
import {
  loadContentFileText,
  type ContentFile,
  type ContentFileSource,
} from "./content-file.js";
import { resolve } from "path";
import type { RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

export class PromptFile implements ContentFile {
  readonly frontmatter: Record<string, any> = {};
  readonly pkg: Package;
  readonly source: ContentFileSource;
  readonly sourceText: string;
  readonly prompt: ParsedPrompt;

  private constructor(
    pkg: Package,
    source: ContentFileSource,
    sourceText: string
  ) {
    this.source = source;
    this.sourceText = sourceText;
    this.pkg = pkg;
    this.prompt = pkg.dotprompt.parse(sourceText);
    this.frontmatter = this.prompt.raw || {};
  }

  private get dotprompt() {
    return this.pkg.dotprompt;
  }

  static async load(
    pkg: Package,
    source: ContentFileSource
  ): Promise<PromptFile> {
    const sourceText = await loadContentFileText(pkg.guidesDir, source);
    return new PromptFile(pkg, source, sourceText);
  }

  async render(
    context: RenderContext,
    args?: Record<string, any>
  ): Promise<ContentBlock[]> {
    const result = await this.dotprompt.render(this.sourceText, {
      context: { ...this.pkg.renderContext(), ...context },
      input: args || {},
    });
    const initialBlocks = result.messages.reduce<ContentBlock[]>((acc, m) => {
      for (const part of m.content) {
        if (part.text) acc.push({ type: "text", text: part.text });
      }
      return acc;
    }, []);

    const finalBlocks: ContentBlock[] = [];
    for (const block of initialBlocks) {
      if (
        block.type !== "text" ||
        !block.text ||
        !block.text.includes("<<<dotguides:embed")
      ) {
        finalBlocks.push(block);
        continue;
      }

      const text = block.text;
      const embedRegex = /<<<dotguides:embed type="doc" name="([^"]+)">>>/g;

      const segments: (string | Promise<string>)[] = [];
      let lastIndex = 0;
      let match;

      while ((match = embedRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          segments.push(text.substring(lastIndex, match.index));
        }

        const docName = match[1];
        const doc = this.pkg.docs.find((d) => d.name === docName);

        const docUri = `docs:${this.pkg.name}:${docName}`;

        if (doc) {
          segments.push(
            doc.render(context).then((renderedBlocks) => {
              const content = renderedBlocks
                .map((b) => b.text || "")
                .join("\n")
                .trim();
              return `\n<doc uri="${docUri}" title="${doc.title}">\n${content}\n</doc>\n`;
            })
          );
        } else {
          segments.push(`\n<doc uri="${docUri}" error="NOT_FOUND" />\n`);
        }

        lastIndex = embedRegex.lastIndex;
      }

      if (lastIndex < text.length) {
        segments.push(text.substring(lastIndex));
      }

      const resolvedSegments = await Promise.all(segments);
      finalBlocks.push({ type: "text", text: resolvedSegments.join("") });
    }
    return finalBlocks;
  }
}
