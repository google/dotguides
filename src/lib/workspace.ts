import { Package } from "./package.js";
import { JavascriptLanguageAdapter } from "./languages/javascript.js";
import type { LanguageAdapter, LanguageContext } from "./language-adapter.js";
import { renderDetails, section } from "./render-utils.js";

export class Workspace {
  readonly languages: LanguageContext[] = [];
  private languageAdapters: LanguageAdapter[] = [
    new JavascriptLanguageAdapter(),
  ];
  readonly packages: { [name: string]: Package } = {};

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
          for (const packageName of context.packages) {
            const pkg = await adapter.loadPackage(directory, packageName);
            this.packages[pkg.name] = pkg;
          }
        }
      }
    }
  }

  get systemInstructions(): string {
    return section(
      { name: "dotguides" },
      `
This workspace uses the *Dotguides* system for providing context-aware coding guidance for open source packages it uses.

## Detected Languages

${this.languages
  .map((l) =>
    renderDetails({
      Language: l.name,
      Runtime: l.runtime,
      Version: l.runtimeVersion,
      "Package Manager": l.packageManager,
    })
  )
  .join("\n\n")}${
        Object.keys(this.packages).length > 0
          ? "\n\n" +
            `
## Package Usage Guides

${Object.values(this.packages)
  .map((p) =>
    p.guides["usage"]
      ? `<package_usage package='${p.name}'>\n${p.guides["usage"]}\n</package_usage>`
      : undefined
  )
  .filter(Boolean)
  .join("\n\n")}
`.trim()
          : ""
      }
`
    );
  }
}
