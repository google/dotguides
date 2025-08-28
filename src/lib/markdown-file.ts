import { load } from "js-yaml";
import {
  loadContentFileText,
  type ContentFile,
  type ContentFileSource,
} from "./content-file.js";
import { resolve } from "path";
import type { RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

export class MarkdownFile implements ContentFile {
  readonly content: string;
  readonly frontmatter: Record<string, any>;
  readonly pkg: Package;

  private constructor(
    public source: ContentFileSource,
    pkg: Package,
    content: string
  ) {
    this.pkg = pkg;
    const match = content.match(/^\s*---\r?\n(.*?)\r?\n---\r?\n/s);
    if (match && match[1]) {
      try {
        this.frontmatter = load(match[1]) || {};
      } catch (e) {
        console.error(e);
        this.frontmatter = {};
      }
      this.content = content.substring(match[0].length).trimStart();
    } else {
      this.frontmatter = {};
      this.content = content;
    }
  }

  static async load(
    pkg: Package,
    source: ContentFileSource
  ): Promise<MarkdownFile> {
    const content = await loadContentFileText(pkg.guidesDir, source);
    const finalSource = { ...source };
    if ("path" in finalSource) {
      finalSource.path = resolve(pkg.guidesDir, finalSource.path);
    }
    return new MarkdownFile(finalSource, pkg, content);
  }

  async render(context: RenderContext): Promise<ContentBlock[]> {
    return [{ type: "text", text: this.content }];
  }
}
