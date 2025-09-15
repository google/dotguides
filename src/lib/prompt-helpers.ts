import type { DotpromptOptions } from "dotprompt";
import type { Package } from "./package.js";
import semver from "semver";
import { readFileSync } from "fs";
import { extname, join, resolve } from "path";
import { shSync } from "./shell-utils.js";

export function packageHelpers(
  pkg: Package,
): NonNullable<DotpromptOptions["helpers"]> {
  return {
    packageFile: (path: string): string => {
      if (!pkg.dir) {
        return `<file path="" error="PACKAGE_DIRECTORY_NOT_FOUND"/>`;
      }
      const absolutePath = resolve(pkg.dir, path);
      try {
        const fileContents = readFileSync(absolutePath, "utf-8");
        const fileExt = extname(absolutePath).slice(1);
        return (
          `<file path="${absolutePath}">
` +
          "```" +
          fileExt +
          `
${fileContents}
` +
          "```" +
          `
</file>`
        );
      } catch (e) {
        return `<file path="${absolutePath}" error="FILE_NOT_FOUND"/>`;
      }
    },
    workspaceFile: (path: string): string => {
      for (const dir of pkg.workspace.directories) {
        try {
          const absolutePath = resolve(dir, path);
          const fileContents = readFileSync(absolutePath, "utf-8");
          const fileExt = extname(absolutePath).slice(1);
          return (
            `<file path="${absolutePath}">
` +
            "```" +
            fileExt +
            `
${fileContents}
` +
            "```" +
            `
</file>`
          );
        } catch (e) {
          // try next directory
        }
      }
      return `<file path="" error="FILE_NOT_FOUND"/>`;
    },
    hasDependency: (packageName: string, range?: string): string => {
      const language = pkg.workspace.languages.find((l) =>
        l.packages.find((p) => p.name === pkg.name),
      );
      if (!language) {
        return "false";
      }
      const dependency = language.packages.find((d) => d.name === packageName);
      if (!dependency) {
        return "false";
      }
      if (range) {
        return semver.satisfies(dependency.packageVersion, range).toString();
      }
      return "true";
    },
    runCommand: (command: string): string => {
      const result = shSync(command);
      if (result.exitCode === 0) {
        return (
          `<shell command="${command}" exit_code="0">
` +
          "```" +
          `
${result.stdout.trim()}
` +
          "```" +
          `
</shell>`
        );
      } else {
        const commandOutput = result.stdout || result.stderr || "";
        return (
          `<shell command="${command}" exit_code="${result.exitCode || 1}">
` +
          "```" +
          `
${commandOutput.trim()}
` +
          "```" +
          `
</shell>`
        );
      }
    },
    contains: (str: any, find: any) => {
      return str.includes(find);
    },
    embedDoc: (name: string) => {
      return `<<<dotguides:embed type="doc" name="${name}">>>`;
    },
  };
}
