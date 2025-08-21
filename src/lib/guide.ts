import { ContentFile } from "./content-file.js";
import type { GuideConfig } from "./types.js";

type ContentFileSource = { path: string } | { url: string };

export class Guide {
  private constructor(
    public contentFile: ContentFile,
    public config: GuideConfig = { description: "" }
  ) {}

  static async load(
    source: ContentFileSource,
    config?: GuideConfig
  ): Promise<Guide> {
    const contentFile = await ContentFile.load(source);
    return new Guide(contentFile, config);
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

  render(context: object): string {
    return this.contentFile.render(context);
  }
}
