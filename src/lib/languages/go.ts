import { exec } from "child_process";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import type { LanguageAdapter, LanguageContext } from "../language-adapter.js";
import { Package } from "../package.js";
import type { Workspace } from "../workspace.js";

export class GoLanguageAdapter implements LanguageAdapter {
  async discover(directory: string): Promise<LanguageContext> {
    const goModPath = join(directory, "go.mod");
    try {
      await stat(goModPath);
    } catch (e) {
      return {
        detected: false,
        name: "go",
        packages: [],
      };
    }

    const context: LanguageContext = {
      detected: true,
      name: "go",
      packages: [],
    };

    const goModContent = await readFile(goModPath, "utf-8");

    const goVersionMatch = goModContent.match(/^go\s+([0-9.]+)/m);
    if (goVersionMatch && goVersionMatch[1]) {
      context.runtimeVersion = goVersionMatch[1];
    } else {
      try {
        const { stdout } = await new Promise<{
          stdout: string;
          stderr: string;
        }>((resolve, reject) => {
          exec("go version", (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });
        const versionMatch = stdout.match(/go version go([0-9.]+\S*)/);
        if (versionMatch && versionMatch[1]) {
          context.runtimeVersion = versionMatch[1];
        }
      } catch (e) {
        // ignore, we'll proceed without the version
      }
    }

    try {
      const { stdout } = await new Promise<{
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        exec(
          "go list -m -f '{{if not .Indirect}}{{.Path}} {{.Version}} {{.Dir}}{{end}}' all",
          { cwd: directory },
          (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          }
        );
      });

      const deps = stdout.trim().split("\n");
      for (const dep of deps) {
        if (!dep) continue;
        const [name, version, packageDir] = dep.split(" ");
        if (!name || !version || !packageDir) continue;

        const guidesDir = join(packageDir, ".guides");
        let hasGuides = false;
        try {
          await stat(guidesDir);
          hasGuides = true;
        } catch (e) {
          // ignore
        }

        context.packages.push({
          name,
          dependencyVersion: version,
          packageVersion: version,
          dir: packageDir,
          guides: hasGuides,
        });
      }
    } catch (e) {
      console.error(`Could not list go dependencies:`, e);
    }

    return context;
  }

  async loadPackage(
    workspace: Workspace,
    directory: string,
    name: string
  ): Promise<Package> {
    try {
      const { stdout: dir } = await new Promise<{
        stdout: string;
        stderr: string;
      }>((resolve, reject) => {
        exec(`go list -f '{{.Dir}}' -m ${name}`, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        });
      });

      const packageDir = dir.trim();
      const guidesDir = join(packageDir, ".guides");

      return await Package.load(workspace, name, guidesDir);
    } catch (e) {
      throw new Error(`Could not find guides for package ${name}`);
    }
  }
}
