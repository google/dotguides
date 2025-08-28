import { loadContentFile, type ContentFile } from "./content-file.js";
import type { GuideConfig, RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";

type ContentFileSource = { path: string } | { url: string };

export class Guide {
  private constructor(
    public contentFile: ContentFile,
    public config: GuideConfig
  ) {}

  static async load(config: GuideConfig): Promise<Guide> {
    const contentFile = await loadContentFile(config);
    return new Guide(contentFile, config);
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

  render(context: RenderContext): Promise<ContentBlock[]> {
    return this.contentFile.render(context);
  }
}
