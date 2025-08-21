import { ContentFile } from "./content-file.js";
import type { CommandConfig } from "./types.js";

type ContentFileSource = { path: string } | { url: string };

export class Command {
  private constructor(
    public contentFile: ContentFile,
    public config: CommandConfig
  ) {}

  static async load(
    source: ContentFileSource,
    config: CommandConfig
  ): Promise<Command> {
    const contentFile = await ContentFile.load(source);
    return new Command(contentFile, config);
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
