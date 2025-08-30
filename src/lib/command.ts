import type {
  ContentBlock,
  ListPromptsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { loadContentFile, type ContentFile } from "./content-file.js";
import type { CommandConfig, RenderContext } from "./types.js";
import type { Package } from "./package.js";

type ContentFileSource = { path: string } | { url: string };

export class Command {
  private constructor(
    public contentFile: ContentFile,
    public config: CommandConfig
  ) {}

  static async load(
    pkg: Package,
    source: ContentFileSource,
    config: CommandConfig
  ): Promise<Command> {
    const contentFile = await loadContentFile(pkg, source);
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
    context: RenderContext,
    args?: Record<string, string>
  ): Promise<ContentBlock[]> {
    return this.contentFile.render(context, args);
  }

  get signature(): string {
    const parts = [this.config.name];
    if (this.arguments) {
      for (const arg of this.arguments) {
        if (arg.required) {
          parts.push(`<${arg.name}>`);
        } else {
          parts.push(`[${arg.name}]`);
        }
      }
    }
    return parts.join(" ");
  }
}
