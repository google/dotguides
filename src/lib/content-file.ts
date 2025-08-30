import { extname, resolve } from "path";
import { readFile } from "fs/promises";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import { readAny } from "./file-utils.js";
import { cachedFetch } from "./cached-fetch.js";
import type { RenderContext } from "./types.js";
import { MarkdownFile } from "./markdown-file.js";
import { PromptFile } from "./prompt-file.js";
import type { Package } from "./package.js";

export type ContentFileSource =
  | { path: string }
  | { url: string; contentType?: string };

export interface ContentFile {
  readonly source: ContentFileSource;
  readonly frontmatter: Record<string, any>;
  readonly pkg: Package;
  render(
    context?: RenderContext,
    args?: Record<string, any>
  ): Promise<ContentBlock[]>;
}

export async function loadContentFileText(
  rootDir: string,
  source: ContentFileSource
): Promise<string> {
  if ("path" in source) {
    return await readFile(resolve(rootDir, source.path), { encoding: "utf8" });
  } else {
    const response = await cachedFetch(source.url);
    return response.text();
  }
}

export async function loadContentFile(
  pkg: Package,
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
    return PromptFile.load(pkg, source);
  }
  return MarkdownFile.load(pkg, source);
}
