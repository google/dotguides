import type { DotpromptOptions } from "dotprompt";
import { execSync } from "child_process";
import type { Package } from "./package.js";
import semver from "semver";
import { readFileSync } from "fs";
import { extname, join, resolve } from "path";
import { readAny } from "./file-utils.js";

export function packageHelpers(
  pkg: Package
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
        return `<file path="${absolutePath}">
\`\`\`${fileExt}
${fileContents}
\`\`\`
</file>`;
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
          return `<file path="${absolutePath}">
\`\`\`${fileExt}
${fileContents}
\`\`\`
</file>`;
        } catch (e) {
          // try next directory
        }
      }
      return `<file path="" error="FILE_NOT_FOUND"/>`;
    },
    hasDependency: (packageName: string, range?: string): string => {
      const language = pkg.workspace.languages.find((l) =>
        l.packages.find((p) => p.name === pkg.name)
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
      try {
        const commandOutput = execSync(command, {
          encoding: "utf8",
          stdio: "pipe",
        });
        return `<shell command="${command}" exit_code="0">
\`\`\`
${commandOutput.trim()}
\`\`\`
</shell>`;
      } catch (e: any) {
        const commandOutput =
          e.stdout?.toString() || e.stderr?.toString() || "";
        const exitCode = e.status || 1;
        return `<shell command="${command}" exit_code="${exitCode}">
\`\`\`
${commandOutput.trim()}
\`\`\`
</shell>`;
      }
    },
    contains: (str: any, find: any) => {
      return str.includes(find);
    },
  };
}
