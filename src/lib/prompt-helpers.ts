import type { DotpromptOptions } from "dotprompt";
import type { Package } from "./package.js";

export function packageHelpers(pkg: Package): DotpromptOptions["helpers"] {
  return {
    packageFile: (path: string) => {
      // TODO: insert the contents of a file relative to the package root. format:
      // <file path="${absolutePath}">
      // ```${fileExt}
      // ${fileContents}
      // ```
      // </file>
      // if not found, return `<file path="" error="FILE_NOT_FOUND"/>`
    },
    workspaceFile: (path: string) => {
      // TODO: insert the contents of the first discovered file resolved from the workspace dirs. use readAny from file-utils. format:
      // <file path="${absolutePath}">
      // ```${fileExt}
      // ${fileContents}
      // ```
      // </file>
      // if not found, return `<file path="" error="FILE_NOT_FOUND"/>`
    },
    hasDependency: (packageName: string, semver?: string) => {
      // TODO: if the current workspace has the specified package (with matching semver) return true, else false
    },
    runCommand: (command: string) => {
      // TODO: synchronously run a shell command, returning its output and exit code in a block that looks like:
      // <shell command="${command}" exit_code="${exitCode}">
      // ```
      // ${commandOutput}
      // ```
      // </shell>
    },
  };
}
