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

import { readdir, stat } from "fs/promises";
import { join, parse, relative, resolve } from "path";
import { Command } from "./command.js";
import { Doc } from "./doc.js";
import { existsAny, readAny } from "./file-utils.js";
import { Guide } from "./guide.js";
import {
  GUIDE_TYPES,
  type CommandConfig,
  type ContentConfig,
  type DotguidesConfig,
  type RenderContext,
} from "./types.js";
import type { Workspace } from "./workspace.js";
import { Dotprompt } from "dotprompt";
import { readFileSync } from "fs";
import { packageHelpers } from "./prompt-helpers.js";
import { countTokens, section } from "./render-utils.js";

export class Package {
  readonly guides: Guide[] = [];
  public config: DotguidesConfig | undefined;
  readonly docs: Doc[] = [];
  readonly commands: Command[] = [];
  public packageVersion: string | undefined;
  public dependencyVersion: string | undefined;
  public dir: string | undefined;
  readonly dotprompt: Dotprompt;

  constructor(
    public workspace: Workspace,
    public name: string,
    public guidesDir: string,
  ) {
    this.dotprompt = new Dotprompt({
      partialResolver(partialName) {
        const partialPath = join(
          guidesDir,
          "partials",
          `${partialName}.prompt`,
        );
        try {
          return readFileSync(partialPath, { encoding: "utf8" }) || " ";
        } catch (e) {
          return null;
        }
      },
      helpers: packageHelpers(this),
    });
  }

  static async load(
    workspace: Workspace,
    name: string,
    guidesDir: string,
  ): Promise<Package> {
    const pkg = new Package(workspace, name, guidesDir);
    await pkg._load();
    return pkg;
  }

  private async _load(): Promise<void> {
    const language = this.workspace.languages.find((l) =>
      l.packages.find((p) => p.name === this.name),
    );
    if (language) {
      const packageInfo = language.packages.find((p) => p.name === this.name);
      if (packageInfo) {
        this.packageVersion = packageInfo.packageVersion;
        this.dependencyVersion = packageInfo.dependencyVersion;
        this.dir = packageInfo.dir;
      }
    }
    const guidesJson = await readAny(this.guidesDir, "config.json");
    if (guidesJson) {
      try {
        this.config = JSON.parse(guidesJson.content);
      } catch (e) {
        console.error(
          `Unable to parse '${resolve(this.guidesDir, "config.js")}': ${e}`,
        );
      }
    }

    // Process guides
    const guidesConfig = this.config?.guides || [];
    const guidePromises = [
      ...guidesConfig.map(async (config) => {
        if (config.url || config.path) {
          return Guide.load(this, config);
        }
        return null;
      }),
      ...GUIDE_TYPES.map(async (builtin) => {
        const discoveredGuide = await existsAny(
          this.guidesDir,
          `${builtin}.md`,
          `${builtin}.prompt`,
        );
        if (!discoveredGuide) return null;
        return Guide.load(this, { name: builtin, path: discoveredGuide });
      }),
    ];

    // Process docs
    const docsConfig = this.config?.docs || [];
    const docNamesFromConfig = new Set(docsConfig.map((d) => d.name));
    const docsDir = resolve(this.guidesDir, "docs");
    const discoveredDocConfigsPromise = this._getDocsFromDir(
      docsDir,
      docsDir,
      docNamesFromConfig,
    );

    const configuredDocConfigs = docsConfig;

    // Process commands
    const commandsConfig = this.config?.commands || [];
    const discoveredCommands = new Map<string, ContentConfig>();
    const commandsDir = resolve(this.guidesDir, "commands");
    if (await stat(commandsDir).catch(() => false)) {
      const commandFiles = await readdir(commandsDir);
      for (const commandFile of commandFiles) {
        if (commandFile.endsWith(".md") || commandFile.endsWith(".prompt")) {
          const name = parse(commandFile).name;
          const path = relative(this.guidesDir, join(commandsDir, commandFile));
          discoveredCommands.set(name, { name, path });
        }
      }
    }

    const allCommands = new Map<string, CommandConfig>();
    for (const [name, config] of discoveredCommands) {
      allCommands.set(name, config);
    }
    for (const command of commandsConfig) {
      allCommands.set(command.name, command);
    }

    const commandPromises = Array.from(allCommands.values()).map((config) => {
      const source = config.url ? { url: config.url } : { path: config.path! };
      return Command.load(this, source, config);
    });

    const [guides, discoveredDocConfigs, commands] = await Promise.all([
      Promise.all(guidePromises),
      discoveredDocConfigsPromise,
      Promise.all(commandPromises),
    ]);

    const allDocConfigs = [...discoveredDocConfigs, ...configuredDocConfigs];
    const docPromises = allDocConfigs.map((config) => Doc.load(this, config));
    const docs = await Promise.all(docPromises);

    this.guides.push(...guides.filter((g): g is Guide => !!g));
    this.docs.push(...docs);
    this.commands.push(...commands);
  }

  private async _getDocsFromDir(
    dir: string,
    baseDir: string,
    docNamesFromConfig: Set<string>,
  ): Promise<ContentConfig[]> {
    if (!(await stat(dir).catch(() => false))) {
      return [];
    }
    const entries = await readdir(dir, {
      withFileTypes: true,
    });
    const promises = entries.map(
      async (entry): Promise<ContentConfig[] | ContentConfig | null> => {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          return this._getDocsFromDir(fullPath, baseDir, docNamesFromConfig);
        }
        if (
          entry.isFile() &&
          (entry.name.endsWith(".md") || entry.name.endsWith(".prompt"))
        ) {
          const relativePath = relative(baseDir, fullPath);
          const name = join(
            parse(relativePath).dir,
            parse(relativePath).name,
          ).replace(/\\/g, "/");

          if (docNamesFromConfig.has(name)) {
            return null; // Already configured, so skip discovery
          }

          return { name, path: resolve(baseDir, fullPath), description: "" };
        }
        return null;
      },
    );

    return (await Promise.all(promises))
      .flat()
      .filter((p): p is ContentConfig => p !== null);
  }

  async systemInstructions(
    options: {
      tokenBudget?: number;
    } = {},
  ): Promise<string> {
    const { tokenBudget = 2000 } = options;
    const usageGuide = this.guides.find((g) => g.config.name === "usage");
    const styleGuide = this.guides.find((g) => g.config.name === "style");

    const usageBlocks = usageGuide ? await usageGuide.render() : [];
    const styleBlocks = styleGuide ? await styleGuide.render() : [];

    const baseDocsList = this.docs.length
      ? this.docs
          .filter((d) => !d.name.includes("/"))
          .map(
            (d) =>
              `- [${d.title}](docs:${this.name}:${d.config.name})${
                d.description ? `: ${d.description}` : ""
              }`,
          )
      : [];
    const baseDocsString = baseDocsList.join("\n");
    const docsTokens = Math.round(baseDocsString.length / 4);

    let totalTokens =
      countTokens(usageBlocks) + countTokens(styleBlocks) + docsTokens;

    let useUsageContent = true;
    let useStyleContent = true;
    const extraDocs: string[] = [];

    if (totalTokens > tokenBudget && styleGuide) {
      useStyleContent = false;
      totalTokens -= countTokens(styleBlocks);
      extraDocs.push(
        `[Style Guide](guides:${this.name}:style) - best practices for coding style with this package`,
      );
    }

    if (totalTokens > tokenBudget && usageGuide) {
      useUsageContent = false;
      totalTokens -= countTokens(usageBlocks);
      extraDocs.push(
        `[Usage Guide](guides:${this.name}:usage) - ALWAYS read this before trying to use ${this.name}`,
      );
    }

    const usageContent = useUsageContent
      ? usageBlocks.map((b) => (b.type === "text" ? b.text : "")).join("\n")
      : undefined;
    const styleContent = useStyleContent
      ? styleBlocks.map((b) => (b.type === "text" ? b.text : "")).join("\n")
      : undefined;

    const finalDocsList = [...extraDocs, ...baseDocsList];
    const finalDocsString = finalDocsList.join("\n");

    return section(
      {
        name: "package",
        attrs: { name: this.name },
        condition: usageGuide || styleGuide || this.docs.length > 0,
      },
      [
        section({ name: "usage_guide", condition: usageContent }, usageContent),
        section({ name: "style_guide", condition: styleContent }, styleContent),
        section(
          { name: "docs", condition: finalDocsString.length > 0 },
          finalDocsString,
        ),
      ],
    );
  }

  doc(name: string) {
    return this.docs.find((d) => d.config.name === name);
  }

  renderContext(hints?: RenderContext["hints"]): RenderContext {
    const language = this.workspace.languages.find((l) =>
      l.packages.find((p) => p.name === this.name),
    );
    if (!language) {
      throw new Error(
        `Could not find language context for package ${this.name}`,
      );
    }
    if (!this.workspace.directories[0]) {
      throw new Error("Workspace has no directory");
    }
    if (!this.packageVersion) {
      throw new Error(`Could not determine package version for ${this.name}`);
    }
    if (!this.dependencyVersion) {
      throw new Error(
        `Could not determine dependency version for ${this.name}`,
      );
    }
    const context: RenderContext = {
      workspaceDir: this.workspace.directories[0],
      packageVersion: this.packageVersion,
      dependencyVersion: this.dependencyVersion,
      language,
    };
    if (hints) {
      context.hints = hints || {};
    }
    return context;
  }
}
