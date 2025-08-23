// src/lib/types.ts

import type { LanguageContext } from "./language-adapter.js";

export type ContentConfig = {
  name: string;
  description?: string;
  title?: string;
} & ({ path: string; url?: never } | { url: string; path?: never });

export type GuideType = "usage" | "style" | "setup" | "upgrade";
export type GuideConfig = ContentConfig & { name: GuideType };

export interface CommandArgument {
  name: string;
  description: string;
  required?: boolean;
}

export type CommandConfig = ContentConfig & { arguments: CommandArgument[] };

export type DocConfig = ContentConfig;
export type PartialConfig = ContentConfig;

export interface DotguidesConfig {
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
