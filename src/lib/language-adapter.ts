import type { Package } from "./package.js";

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
  packages: string[];
}

export interface LanguageAdapter {
  discover(directory: string): Promise<LanguageContext>;
  loadPackage(directory: string, name: string): Promise<Package>;
}
