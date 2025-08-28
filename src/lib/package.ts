import { readdir, stat } from "fs/promises";
import { join, parse, relative, resolve } from "path";
import { Command } from "./command.js";
import { Doc } from "./doc.js";
import { existsAny, readAny } from "./file-utils.js";
import { Guide } from "./guide.js";
import {
  GUIDE_TYPES,
  type ContentConfig,
  type DotguidesConfig,
  type RenderContext,
} from "./types.js";
import type { Workspace } from "./workspace.js";
import { Dotprompt } from "dotprompt";
import { existsSync, readFileSync } from "fs";

export class Package {
  readonly guides: Guide[] = [];
  public config: DotguidesConfig | undefined;
  readonly docs: Doc[] = [];
  readonly commands: Command[] = [];
  public packageVersion: string | undefined;
  public dependencyVersion: string | undefined;
  readonly dotprompt: Dotprompt;

  constructor(
    public workspace: Workspace,
    public name: string,
    public guidesDir: string
  ) {
    this.dotprompt = new Dotprompt({
      partialResolver(partialName) {
        const partialPath = join(
          guidesDir,
          "partials",
          `${partialName}.prompt`
        );
        try {
          return readFileSync(partialPath, { encoding: "utf8" }) || " ";
        } catch (e) {
          return null;
        }
      },
      helpers: {},
    });
  }

  static async load(
    workspace: Workspace,
    name: string,
    guidesDir: string
  ): Promise<Package> {
    const pkg = new Package(workspace, name, guidesDir);
    await pkg._load();
    return pkg;
  }

  private async _load(): Promise<void> {
    const packageJsonPath = join(this.guidesDir, "..", "package.json");
    const packageJsonContent = await readAny(packageJsonPath);
    if (packageJsonContent) {
      const packageJson = JSON.parse(packageJsonContent.content);
      this.packageVersion = packageJson.version;
    }

    for (const dir of this.workspace.directories) {
      const workspacePackageJson = await readAny(join(dir, "package.json"));
      if (workspacePackageJson) {
        const manifest = JSON.parse(workspacePackageJson.content);
        const allDeps = {
          ...manifest.dependencies,
          ...manifest.devDependencies,
        };
        if (allDeps[this.name]) {
          this.dependencyVersion = allDeps[this.name];
          break;
        }
      }
    }
    const guidesJson = await readAny(this.guidesDir, "config.json");
    if (guidesJson) {
      this.config = JSON.parse(guidesJson.content);
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
          `${builtin}.prompt`
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
      docNamesFromConfig
    );

    const configuredDocConfigs = docsConfig;

    // Process commands
    const commandsConfig = this.config?.commands || [];
    const commandNamesFromConfig = new Set(commandsConfig.map((c) => c.name));
    const commandsDir = join(this.guidesDir, "commands");
    const commandPromises: Promise<Command>[] = [];
    if (await stat(commandsDir).catch(() => false)) {
      const commandFiles = await readdir(commandsDir);
      for (const commandFile of commandFiles) {
        if (commandFile.endsWith(".md")) {
          const name = parse(commandFile).name;
          const path = join(commandsDir, commandFile);
          const config = commandsConfig.find((c) => c.name === name) || {
            name,
            description: "",
            arguments: [],
            path,
          };
          commandPromises.push(Command.load(this, { path }, config));
          commandNamesFromConfig.delete(name);
        }
      }
    }
    for (const name of Array.from(commandNamesFromConfig)) {
      const config = commandsConfig.find((c) => c.name === name);
      if (config?.url) {
        commandPromises.push(Command.load(this, { url: config.url }, config));
      } else if (config?.path) {
        commandPromises.push(Command.load(this, { path: config.path }, config));
      }
    }

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
    docNamesFromConfig: Set<string>
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
            parse(relativePath).name
          ).replace(/\\/g, "/");

          if (docNamesFromConfig.has(name)) {
            return null; // Already configured, so skip discovery
          }

          return { name, path: resolve(baseDir, fullPath), description: "" };
        }
        return null;
      }
    );

    return (await Promise.all(promises))
      .flat()
      .filter((p): p is ContentConfig => p !== null);
  }

  doc(name: string) {
    return this.docs.find((d) => d.config.name === name);
  }

  renderContext(hints?: RenderContext["hints"]): RenderContext {
    const language = this.workspace.languages.find((l) =>
      l.packages.includes(this.name)
    );
    if (!language) {
      throw new Error(
        `Could not find language context for package ${this.name}`
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
        `Could not determine dependency version for ${this.name}`
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
