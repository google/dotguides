import {
  loadContentFile,
  type ContentFile,
  type ContentFileSource,
} from "./content-file.js";
import type { ContentConfig, RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

export class Doc {
  private constructor(
    public contentFile: ContentFile,
    public config: ContentConfig
  ) {}

  static async load(pkg: Package, config: ContentConfig): Promise<Doc> {
    const { name, description, title, ...source } = config;
    const contentFile = await loadContentFile(pkg, source as ContentFileSource);
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
