import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { extname } from "path";
import { readAny } from "./file-utils.js";

type ContentFileSource = { path: string } | { url: string };

export class ContentFile {
  readonly content: string;
  readonly frontmatter: any;
  private _contentType: string | undefined;

  private constructor(
    public source: ContentFileSource,
    content: string,
    contentType?: string
  ) {
    this._contentType = contentType;
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

  static async load(source: ContentFileSource): Promise<ContentFile> {
    let content: string;
    let contentType: string | undefined;

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
      const response = await fetch(source.url);
      contentType = response.headers.get("content-type") || undefined;
      content = await response.text();
    }
    return new ContentFile(source, content, contentType);
  }

  render(context: object): string {
    let isPrompt = false;
    if ("path" in this.source) {
      isPrompt = extname(this.source.path) === ".prompt";
    } else {
      const url = new URL(this.source.url);
      isPrompt =
        url.pathname.endsWith(".prompt") ||
        this._contentType === "text/x-dotprompt";
    }

    if (isPrompt) {
      // TODO: Implement rendering with Dotprompt
      // const template = new Dotprompt(this.content);
      // return template.render(context);
      return this.content; // Placeholder
    }

    return this.content;
  }
}
