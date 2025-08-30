// src/lib/types.ts

import type { LanguageContext } from "./language-adapter.js";

export type ContentConfig = {
  /** Identifying name of the content. */
  name: string;
  /** Concise description of the purpose of the content. */
  description?: string;
  /** Human-friendly title for the content. */
  title?: string;
} & (
  | {
      /** File path relative to the `.guides` folder, e.g. `../README.md` would be the path to the package README. */
      path: string;
      url?: never;
    }
  | {
      /** URL pointing to the content. Content of URL is expected to be plaintext. */
      url: string;
      path?: never;
    }
);

export const GUIDE_TYPES = ["usage", "style", "setup", "upgrade"];
export type GuideType = (typeof GUIDE_TYPES)[number];
export type GuideConfig = ContentConfig & { name: GuideType };

export interface CommandArgument {
  name: string;
  description: string;
  required?: boolean;
}

export type CommandConfig = ContentConfig & { arguments?: CommandArgument[] };

export type DocConfig = ContentConfig;
export type PartialConfig = ContentConfig;

export interface DotguidesConfig {
  /** Configuration MCP servers that should be installed while using this library. */
  mcpServers?: Record<
    string,
    { command: string; args: string[] } | { url: string }
  >;
  guides?: GuideConfig[];
  docs?: DocConfig[];
  commands?: CommandConfig[];
  partials?: PartialConfig[];
}

export interface RenderContext {
  workspaceDir: string;
  /** The actual specific exact package version installed. */
  packageVersion: string;
  /** The package version as declared in the dependency file (e.g. semver range). */
  dependencyVersion: string;
  /** Context about the current language, package manager, runtime, etc. */
  language: LanguageContext;
  /** Optional information that supplies additional info about the current environment. */
  hints?: {
    /** The MCP client currently connected if known. */
    mcpClient?: { name: string; version: string };
    /** If the specific model being used for inference is known, it will be supplied here. */
    modelName?: string;
  };
}
