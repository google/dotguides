import { Package } from "./package.js";
import { JavascriptLanguageAdapter } from "./languages/javascript.js";
import { DartLanguageAdapter } from "./languages/dart.js";
import type { LanguageAdapter, LanguageContext } from "./language-adapter.js";
import { renderDetails, section } from "./render-utils.js";
import type { Doc } from "./doc.js";
import { nullable } from "zod";

export class Workspace {
  readonly languages: LanguageContext[] = [];
  private languageAdapters: LanguageAdapter[] = [
    new JavascriptLanguageAdapter(),
    new DartLanguageAdapter(),
  ];
  readonly packageMap: { [name: string]: Package } = {};

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
            const pkg = await adapter.loadPackage(this, directory, packageName);
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

  async systemInstructions(
    options: { supportsResources?: boolean; listDocs?: boolean } = {}
  ): Promise<string> {
    const packageSections = await Promise.all(
      Object.values(this.packageMap).map(async (p) => {
        const usageGuide = p.guides.find((g) => g.config.name === "usage");
        const styleGuide = p.guides.find((g) => g.config.name === "style");

        let usageContent: string | undefined;
        if (usageGuide) {
          const blocks = await usageGuide.content;
          const firstBlock = blocks[0];
          if (firstBlock?.type === "text") {
            usageContent = firstBlock.text;
          }
        }

        let styleContent: string | undefined;
        if (styleGuide) {
          const blocks = await styleGuide.content;
          const firstBlock = blocks[0];
          if (firstBlock?.type === "text") {
            styleContent = firstBlock.text;
          }
        }

        return section(
          {
            name: "package",
            attrs: { name: p.name },
            condition: usageGuide || styleGuide,
          },
          [
            section({ name: "usage_guide" }, usageContent),
            section({ name: "style_guide" }, styleContent),
            options.listDocs
              ? section(
                  { name: "docs" },
                  p.docs.length
                    ? p.docs
                        .filter((d) => !d.name.includes("/"))
                        .map(
                          (d) =>
                            `- [${d.title}](docs:${p.name}:${d.config.name})${
                              d.description ? `: ${d.description}` : ""
                            }`
                        )
                        .join("\n")
                    : null
                )
              : "",
          ]
        );
      })
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
    })
  )
  .join("\n\n")}${
        Object.keys(this.packageMap).length > 0
          ? "\n\n" +
            `
## Package Usage Guides

The following are the discovered package usage guides for this workspace. FOLLOW THEIR GUIDANCE CAREFULLY. Not all packages have discoverable guidance files.

${packageSections.join("\n\n")}
`.trim()
          : ""
      }`.trim()
    );
  }
}
