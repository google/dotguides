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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Package } from "./package.js";
import type { Workspace } from "./workspace.js";

export interface PackageInfo {
  name: string;
  /** The specific installed version of the package in the current workspace. */
  packageVersion: string;
  /** The semver string provided by the user in the dependency file. */
  dependencyVersion: string;
  /** The absolute path to the installed package directory. */
  dir: string;
  /** True if this is a development dependency and not a production dependency. */
  development?: boolean;
  /** True if this is an optional dependency. */
  optional?: boolean;
  /** True if the package has guides, false if not. */
  guides: boolean;
}

export interface LanguageContext {
  /** This is true if use of the language is detected in a specific directory (e.g. by looking for relevant dependency files). */
  detected: boolean;
  /** The name of the language */
  name: string;
  /** If a language has multiple package managers, this specifies which one was detected. */
  packageManager?: string;
  /** If a language has multiple runtimes (e.g. `nodejs`, `bun`, `deno`), which one was detected. */
  runtime?: string;
  /** The version of the runtime (e.g. '22.14.7' for Node.js or '1.24.2' for go). Prefer config-based detection, fallback to shell command version detection. */
  runtimeVersion?: string;
  /** The names of packages discovered for this language that have guides */
  packages: PackageInfo[];
  /** The package for the workspace directory itself. */
  workspacePackage?: PackageInfo;
}

export interface LanguageAdapter {
  discover(directory: string): Promise<LanguageContext>;
  loadPackage(
    workspace: Workspace,
    directory: string,
    name: string
  ): Promise<Package>;
  discoverContrib?(packages: string[]): Promise<string[]>;
}

export const packagesWithGuides = (packages: PackageInfo[]): PackageInfo[] => {
  return packages.filter((p) => p.guides);
};
