import { readdir, stat } from "fs/promises";
import { join, parse, relative } from "path";
import { Command } from "./command.js";
import { Doc } from "./doc.js";
import { existsAny, readAny } from "./file-utils.js";
import { Guide } from "./guide.js";
import type { DotguidesConfig } from "./types.js";

export class Package {
  private guidesJSON: DotguidesConfig | undefined;
  readonly guides: { [key in "usage" | "style" | "setup"]?: Guide } = {};
  readonly docs: Doc[] = [];
  readonly commands: Command[] = [];

  constructor(public name: string, public guidesDir: string) {}

  static async load(name: string, guidesDir: string): Promise<Package> {
    const pkg = new Package(name, guidesDir);
    await pkg._load();
    return pkg;
  }

  private async _load(): Promise<void> {
    const guidesJson = await readAny(this.guidesDir, "guides.json");
    if (guidesJson) {
      this.guidesJSON = JSON.parse(guidesJson.content);
    }

    // Process guides (setup, usage, style)
    const guideTypes: ("setup" | "usage" | "style")[] = [
      "setup",
      "usage",
      "style",
    ] as const;
    for (const type of guideTypes) {
      const config = this.guidesJSON?.guides?.[type];
      const filePath = await existsAny(
        this.guidesDir,
        `${type}.md`,
        `${type}.prompt`
      );

      if (config?.url)
        this.guides[type] = await Guide.load({ url: config.url }, config);
      else if (filePath)
        this.guides[type] = await Guide.load({ path: filePath }, config);
    }

    // Process docs
    const docsConfig = this.guidesJSON?.docs || [];
    const docNamesFromConfig = new Set(docsConfig.map((d) => d.name));

    // Docs from filesystem
    const docsDir = join(this.guidesDir, "docs");
    await this._loadDocsFromDir(docsDir, docsDir, docNamesFromConfig);

    // Docs ONLY from config (URL-based)
    for (const name of Array.from(docNamesFromConfig)) {
      const config = docsConfig.find((d) => d.name === name);
      if (config?.url) {
        this.docs.push(await Doc.load({ url: config.url }, config));
      }
    }

    // Process commands
    const commandsConfig = this.guidesJSON?.commands || [];
    const commandNamesFromConfig = new Set(commandsConfig.map((c) => c.name));

    // Commands from filesystem
    const commandsDir = join(this.guidesDir, "commands");
    if (await stat(commandsDir).catch(() => false)) {
      const commandFiles = await readdir(commandsDir);
      for (const commandFile of commandFiles) {
        if (commandFile.endsWith(".md")) {
          const name = parse(commandFile).name;
          const config = commandsConfig.find((c) => c.name === name) || {
            name,
            description: "",
            arguments: [],
          };
          this.commands.push(
            await Command.load({ path: join(commandsDir, commandFile) }, config)
          );
          commandNamesFromConfig.delete(name);
        }
      }
    }

    // Commands ONLY from config
    for (const name of Array.from(commandNamesFromConfig)) {
      const config = commandsConfig.find((c) => c.name === name);
      if (config) {
        // This will add commands from JSON that didn't have a file
        this.commands.push(
          await Command.load(
            { path: join(commandsDir, `${config.name}.md`) },
            config
          )
        );
      }
    }
  }

  private async _loadDocsFromDir(
    dir: string,
    baseDir: string,
    docNamesFromConfig: Set<string>
  ): Promise<void> {
    if (!(await stat(dir).catch(() => false))) {
      return;
    }
    const entries = await readdir(dir, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await this._loadDocsFromDir(fullPath, baseDir, docNamesFromConfig);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".md") || entry.name.endsWith(".prompt"))
      ) {
        const relativePath = relative(baseDir, fullPath);
        const name = join(
          parse(relativePath).dir,
          parse(relativePath).name
        ).replace(/\\/g, "/");
        const config = this.guidesJSON?.docs?.find((d) => d.name === name) || {
          name,
          description: "",
        };
        this.docs.push(await Doc.load({ path: fullPath }, config));
        docNamesFromConfig.delete(name);
      }
    }
  }

  doc(name: string) {
    return this.docs.find((d) => d.config.name === name);
  }
}
