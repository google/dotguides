import { loadContentFile, type ContentFile } from "./content-file.js";
import type { GuideConfig, RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Package } from "./package.js";

type ContentFileSource = { path: string } | { url: string };

export class Guide {
  private constructor(
    public contentFile: ContentFile,
    public config: GuideConfig
  ) {}

  static async load(pkg: Package, config: GuideConfig): Promise<Guide> {
    const contentFile = await loadContentFile(pkg, config as ContentFileSource);
    return new Guide(contentFile, config);
  }

  get source() {
    return this.contentFile.source;
  }

  get frontmatter() {
    return this.contentFile.frontmatter;
  }

  render(context?: RenderContext): Promise<ContentBlock[]> {
    return this.contentFile.render(context);
  }
}
