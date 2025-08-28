import { Dotprompt } from "dotprompt";
import type { ContentFile, ContentFileSource } from "./content-file.js";
import { resolve } from "path";
import type { RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

export class PromptFile implements ContentFile {
  readonly frontmatter: Record<string, any> = {};
  readonly pkg: Package;

  private constructor(public source: ContentFileSource, pkg: Package) {
    this.pkg = pkg;
  }

  private get dotprompt() {
    return this.pkg.dotprompt;
  }

  static async load(
    pkg: Package,
    source: ContentFileSource
  ): Promise<PromptFile> {
    const finalSource = { ...source };
    if ("path" in finalSource) {
      finalSource.path = resolve(pkg.guidesDir, finalSource.path);
    }
    return new PromptFile(finalSource, pkg);
  }

  async render(context: RenderContext): Promise<ContentBlock[]> {
    // TODO: Implement rendering with Dotprompt
    return [];
  }
}
