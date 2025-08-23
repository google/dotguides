import { extname } from "path";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { RenderContext } from "./types.js";
import { MarkdownFile } from "./markdown-file.js";
import { DotpromptFile } from "./dotprompt-file.js";

export type ContentFileSource =
  | { path: string }
  | { url: string; contentType?: string };

export interface ContentFile {
  readonly source: ContentFileSource;
  readonly frontmatter: Record<string, any>;
  render(context: RenderContext): Promise<ContentBlock[]>;
}

export async function loadContentFile(
  source: ContentFileSource
): Promise<ContentFile> {
  let isPrompt = false;
  if ("path" in source) {
    isPrompt = extname(source.path) === ".prompt";
  } else {
    const url = new URL(source.url);
    isPrompt =
      url.pathname.endsWith(".prompt") ||
      source.contentType === "text/x-dotprompt";
  }

  if (isPrompt) {
    return DotpromptFile.load(source);
  }
  return MarkdownFile.load(source);
}
