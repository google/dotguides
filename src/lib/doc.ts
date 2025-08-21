import { ContentFile } from "./content-file.js";
import type { DocConfig } from "./types.js";

type ContentFileSource = { path: string } | { url: string };

export class Doc {
  private constructor(
    public contentFile: ContentFile,
    public config: DocConfig
  ) {}

  static async load(
    source: ContentFileSource,
    config: DocConfig
  ): Promise<Doc> {
    const contentFile = await ContentFile.load(source);
    return new Doc(contentFile, config);
  }

  get source() {
    return this.contentFile.source;
  }

  get content() {
    return this.contentFile.content;
  }

  get frontmatter() {
    return this.contentFile.frontmatter;
  }

  get description() {
    return this.config.description || this.contentFile.frontmatter.description;
  }

  get title() {
    return this.contentFile.frontmatter.title || this.config.name;
  }

  render(context: object): string {
    return this.contentFile.render(context);
  }
}
