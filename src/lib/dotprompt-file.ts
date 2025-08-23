import type { ContentFile, ContentFileSource } from "./content-file.js";
import type { RenderContext } from "./types.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";

export class DotpromptFile implements ContentFile {
  readonly frontmatter: Record<string, any> = {};

  private constructor(public source: ContentFileSource) {}

  static async load(source: ContentFileSource): Promise<DotpromptFile> {
    return new DotpromptFile(source);
  }

  async render(context: RenderContext): Promise<ContentBlock[]> {
    // TODO: Implement rendering with Dotprompt
    return [];
  }
}
