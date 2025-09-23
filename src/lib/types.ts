/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
