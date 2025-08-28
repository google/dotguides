import { Dotprompt, type ParsedPrompt } from "dotprompt";
import {
  loadContentFileText,
  type ContentFile,
  type ContentFileSource,
} from "./content-file.js";
import { resolve } from "path";
import type { RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

export class PromptFile implements ContentFile {
  readonly frontmatter: Record<string, any> = {};
  readonly pkg: Package;
  readonly source: string;
  readonly prompt: ParsedPrompt;

  private constructor(pkg: Package, source: string) {
    this.source = source;
    this.pkg = pkg;
    this.prompt = pkg.dotprompt.parse(source);
    this.frontmatter = this.prompt.raw || {};
  }

  private get dotprompt() {
    return this.pkg.dotprompt;
  }

  static async load(
    pkg: Package,
    source: ContentFileSource
  ): Promise<PromptFile> {
    const finalSource = { ...source };
    const sourceText = await loadContentFileText(pkg.guidesDir, source);
    return new PromptFile(pkg, sourceText);
  }

  async render(context: RenderContext): Promise<ContentBlock[]> {
    this.dotprompt.render(this.source, { context });
  }
}
