import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { extname } from "path";
import { readAny } from "./file-utils.js";

type ContentFileSource = { path: string } | { url: string };

export class ContentFile {
  private _content: string | undefined;
  private _frontmatter: any;
  private _contentType: string | undefined;

  protected constructor(public source: ContentFileSource) {}

  static async load(source: ContentFileSource): Promise<ContentFile> {
    const file = new ContentFile(source);
    await file._load();
    return file;
  }

  private async _load(): Promise<void> {
    if ("path" in this.source) {
      const file = await readAny(
        "",
        `${this.source.path}.md`,
        `${this.source.path}.prompt`
      );
      if (file) {
        this.source.path = file.file;
        this._content = file.content;
      } else {
        this._content = await readFile(this.source.path, "utf-8");
      }
    } else {
      const response = await fetch(this.source.url);
      this._contentType = response.headers.get("content-type") || undefined;
      this._content = await response.text();
    }
  }

  getContent(): string {
    if (this._content === undefined) {
      throw new Error(
        "Content not loaded. Please use ContentFile.load() to instantiate."
      );
    }
    return this._content;
  }

  getFrontmatter(): any {
    if (this._frontmatter === undefined) {
      const content = this.getContent();
      const match = content.match(/^---\n(.*)\n---\n/s);
      if (match && match[1]) {
        this._frontmatter = load(match[1]);
      } else {
        this._frontmatter = {};
      }
    }
    return this._frontmatter;
  }

  render(context: object): string {
    const content = this.getContent();
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
      // const template = new Dotprompt(content);
      // return template.render(context);
      return content; // Placeholder
    }

    const match = content.match(/^---\n(.*)\n---\n/s);
    if (match) {
      return content.substring(match[0].length);
    }

    return content;
  }
}
