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
  readonly source: ContentFileSource;
  readonly sourceText: string;
  readonly prompt: ParsedPrompt;

  private constructor(
    pkg: Package,
    source: ContentFileSource,
    sourceText: string
  ) {
    this.source = source;
    this.sourceText = sourceText;
    this.pkg = pkg;
    this.prompt = pkg.dotprompt.parse(sourceText);
    this.frontmatter = this.prompt.raw || {};
  }

  private get dotprompt() {
    return this.pkg.dotprompt;
  }

  static async load(
    pkg: Package,
    source: ContentFileSource
  ): Promise<PromptFile> {
    const sourceText = await loadContentFileText(pkg.guidesDir, source);
    return new PromptFile(pkg, source, sourceText);
  }

  async render(context: RenderContext): Promise<ContentBlock[]> {
    return [];
  }
}
