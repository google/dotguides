import { loadContentFile, type ContentFile } from "./content-file.js";
import type { ContentConfig, RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";

type ContentFileSource = { path: string } | { url: string };

export class Doc {
  private constructor(
    public contentFile: ContentFile,
    public config: ContentConfig
  ) {}

  static async load(
    source: ContentFileSource,
    config: ContentConfig
  ): Promise<Doc> {
    const contentFile = await loadContentFile(source);
    return new Doc(contentFile, config);
  }

  get source() {
    return this.contentFile.source;
  }

  get content(): Promise<ContentBlock[]> {
    return this.render({
      workspaceDir: "",
      packageVersion: "",
      dependencyVersion: "",
      language: {
        detected: false,
        name: "",
        packages: [],
      },
    });
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

  get name() {
    return this.config.name;
  }

  render(context: RenderContext): Promise<ContentBlock[]> {
    return this.contentFile.render(context);
  }
}
