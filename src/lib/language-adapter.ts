import type { Package } from "./package.js";
import type { Workspace } from "./workspace.js";

export interface PackageInfo {
  name: string;
  /** The specific installed version of the package in the current workspace. */
  packageVersion: string;
  /** The semver string provided by the user in the dependency file. */
  dependencyVersion: string;
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
