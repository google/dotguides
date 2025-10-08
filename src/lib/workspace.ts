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

import { Package } from "./package.js";
import {
  type LanguageAdapter,
  type LanguageContext,
  packagesWithGuides,
} from "./language-adapter.js";
import { allLanguages } from "./language.js";
import { renderDetails, section } from "./render-utils.js";
import type { Doc } from "./doc.js";
import type { Guide } from "./guide.js";
import { nullable } from "zod";

export class Workspace {
  readonly languages: LanguageContext[] = [];
  private languageAdapters: LanguageAdapter[] = allLanguages;
  packageMap: { [name: string]: Package } = {};

  constructor(public directories: string[]) {}

  static async load(directories: string[]): Promise<Workspace> {
    const workspace = new Workspace(directories);
    await workspace._load();
    return workspace;
  }

  private async _load(): Promise<void> {
    for (const directory of this.directories) {
      for (const adapter of this.languageAdapters) {
        const context = await adapter.discover(directory);
        if (context.detected) {
          this.languages.push(context);
          for (const packageInfo of packagesWithGuides(context.packages)) {
            const pkg = await adapter.loadPackage(
              this,
              directory,
              packageInfo.name,
            );
            this.packageMap[pkg.name] = pkg;
          }
        }
      }
    }
  }

  get packages() {
    return Object.values(this.packageMap);
  }

  package(name: string): Package | null {
    return this.packageMap[name] || null;
  }

  doc(pkg: string | undefined, name: string | undefined): Doc | null {
    if (!pkg || !name) return null;
    return this.package(pkg)?.docs.find((d) => name === d.name) || null;
  }

  guide(pkg: string | undefined, name: string | undefined): Guide | null {
    if (!pkg || !name) return null;
    return (
      this.package(pkg)?.guides.find((g) => name === g.config.name) || null
    );
  }

  get packagesWithSetup(): Package[] {
    return this.packages.filter((p) =>
      p.guides.some((g) => g.config.name === "setup"),
    );
  }

  async systemInstructions(
    options: {
      selectedPackages?: Package[];
      supportsResources?: boolean;
      contextBudget?: number;
    } = {},
  ): Promise<string> {
    const packagesToUse =
      options.selectedPackages || Object.values(this.packageMap);
    const packageSections = await Promise.all(
      packagesToUse.map(async (p) => {
        return p.systemInstructions(
          options.contextBudget
            ? { tokenBudget: options.contextBudget }
            : undefined,
        );
      }),
    );

    return section(
      { name: "dotguides" },
      `
This workspace uses the *Dotguides* system for providing context-aware coding guidance for open source packages it uses.${
        options.supportsResources
          ? ""
          : " Use the `read_docs` tool to load documentation files relevant to specific tasks."
      }

## Detected Languages

${this.languages
  .map((l) =>
    renderDetails({
      Language: l.name,
      Runtime: l.runtime,
      Version: l.runtimeVersion,
      "Package Manager": l.packageManager,
    }),
  )
  .join("\n\n")}${
        packagesToUse.length > 0
          ? "\n\n" +
            `
## Package Usage Guides

The following are the discovered package usage guides for this workspace. FOLLOW THEIR GUIDANCE CAREFULLY. Not all packages have discoverable guidance files.

${packageSections.join("\n\n")}
`.trim()
          : ""
      }`.trim(),
    );
  }

  mcpConfig(options: { selectedPackages?: Package[] } = {}) {
    const packagesToUse =
      options.selectedPackages || Object.values(this.packageMap);
    const mcpServers: { [key: string]: any } = {
      dotguides: {
        command: "dotguides",
        args: ["mcp"],
      },
    };
    for (const pkg of packagesToUse) {
      if (pkg.config?.mcpServers) {
        for (const serverName in pkg.config.mcpServers) {
          mcpServers[serverName] = pkg.config.mcpServers[serverName];
        }
      }
    }
    return { mcpServers };
  }
}
