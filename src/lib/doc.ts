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

import {
  loadContentFile,
  type ContentFile,
  type ContentFileSource,
} from "./content-file.js";
import type { ContentConfig, RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

export class Doc {
  private constructor(
    public contentFile: ContentFile,
    public config: ContentConfig,
  ) {}

  static async load(pkg: Package, config: ContentConfig): Promise<Doc> {
    const { name, description, title, ...source } = config;
    const contentFile = await loadContentFile(pkg, source as ContentFileSource);
    return new Doc(contentFile, config);
  }

  get source() {
    return this.contentFile.source;
  }

  get content(): Promise<ContentBlock[]> {
    return this.render({
      workspaceDir: "",
      packageVersion: "",
      dependencyVersion: "",
      language: {
        detected: false,
        name: "",
        packages: [],
      },
    });
  }

  get frontmatter() {
    return this.contentFile.frontmatter;
  }

  get description() {
    return this.config.description || this.contentFile.frontmatter.description;
  }

  get title() {
    return this.contentFile.frontmatter.title || this.config.name;
  }

  get name() {
    return this.config.name;
  }

  render(context: RenderContext): Promise<ContentBlock[]> {
    return this.contentFile.render(context);
  }
}
