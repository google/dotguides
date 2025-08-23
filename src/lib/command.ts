import type {
  ContentBlock,
  ListPromptsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { loadContentFile, type ContentFile } from "./content-file.js";
import type { CommandConfig, RenderContext } from "./types.js";

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
    const contentFile = await loadContentFile(source);
    return new Command(contentFile, config);
  }

  get source() {
    return this.contentFile.source;
  }

  get frontmatter() {
    return this.contentFile.frontmatter;
  }

  get arguments(): ListPromptsResult["prompts"][number]["arguments"] {
    return this.contentFile.frontmatter.arguments;
  }

  render(
    args: Record<string, string>,
    context: RenderContext
  ): Promise<ContentBlock[]> {
    return this.contentFile.render({ ...context, ...args });
  }
}
