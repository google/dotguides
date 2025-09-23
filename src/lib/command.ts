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
  ContentBlock,
  ListPromptsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { loadContentFile, type ContentFile } from "./content-file.js";
import type { CommandConfig, RenderContext } from "./types.js";
import type { Package } from "./package.js";

type ContentFileSource = { path: string } | { url: string };

export class Command {
  private constructor(
    public contentFile: ContentFile,
    public config: CommandConfig,
  ) {}

  static async load(
    pkg: Package,
    source: ContentFileSource,
    config: CommandConfig,
  ): Promise<Command> {
    const contentFile = await loadContentFile(pkg, source);
    return new Command(contentFile, config);
  }

  get source() {
    return this.contentFile.source;
  }

  get frontmatter() {
    return this.contentFile.frontmatter;
  }

  get arguments(): ListPromptsResult["prompts"][number]["arguments"] {
    return this.contentFile.frontmatter.arguments;
  }

  render(
    context: RenderContext,
    args?: Record<string, string>,
  ): Promise<ContentBlock[]> {
    return this.contentFile.render(context, args);
  }

  get signature(): string {
    const parts = [this.config.name];
    if (this.arguments) {
      for (const arg of this.arguments) {
        if (arg.required) {
          parts.push(`<${arg.name}>`);
        } else {
          parts.push(`[${arg.name}]`);
        }
      }
    }
    return parts.join(" ");
  }
}
