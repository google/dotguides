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

import { loadContentFile, type ContentFile } from "./content-file.js";
import type { GuideConfig, RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

type ContentFileSource = { path: string } | { url: string };

export class Guide {
  private constructor(
    public contentFile: ContentFile,
    public config: GuideConfig,
  ) {}

  static async load(pkg: Package, config: GuideConfig): Promise<Guide> {
    const contentFile = await loadContentFile(pkg, config as ContentFileSource);
    return new Guide(contentFile, config);
  }

  get source() {
    return this.contentFile.source;
  }

  get frontmatter() {
    return this.contentFile.frontmatter;
  }

  render(context?: RenderContext): Promise<ContentBlock[]> {
    return this.contentFile.render(context);
  }
}
