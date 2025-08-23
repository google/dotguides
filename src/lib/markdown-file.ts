import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { readAny } from "./file-utils.js";
import { cachedFetch } from "./cached-fetch.js";
import type { ContentFile, ContentFileSource } from "./content-file.js";
import type { RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";

export class MarkdownFile implements ContentFile {
  readonly content: string;
  readonly frontmatter: Record<string, any>;

  private constructor(public source: ContentFileSource, content: string) {
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

  static async load(source: ContentFileSource): Promise<MarkdownFile> {
    let content: string;

    if ("path" in source) {
      const file = await readAny(
        "",
        `${source.path}.md`,
        `${source.path}.prompt`
      );
      if (file) {
        source.path = file.file;
        content = file.content;
      } else {
        content = await readFile(source.path, "utf-8");
      }
    } else {
      const response = await cachedFetch(source.url);
      content = await response.text();
    }
    return new MarkdownFile(source, content);
  }

  async render(context: RenderContext): Promise<ContentBlock[]> {
    return [{ type: "text", text: this.content }];
  }
}
