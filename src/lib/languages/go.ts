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

import { readFile, stat } from "fs/promises";
import { join } from "path";
import type { LanguageAdapter, LanguageContext } from "../language-adapter.js";
import { Package } from "../package.js";
import { sh } from "../shell-utils.js";
import type { Workspace } from "../workspace.js";

export class GoLanguageAdapter implements LanguageAdapter {
  async discover(directory: string): Promise<LanguageContext> {
    const goModPath = join(directory, "go.mod");
    let goModContent: string;
    try {
      goModContent = await readFile(goModPath, "utf-8");
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

    const moduleMatch = goModContent.match(/^module\s+(.+)/m);
    if (moduleMatch && moduleMatch[1]) {
      const guidesDir = join(directory, ".guides");
      const hasGuides = !!(await stat(guidesDir).catch(() => false));
      context.workspacePackage = {
        name: moduleMatch[1],
        packageVersion: "unknown",
        dependencyVersion: "unknown",
        dir: directory,
        guides: hasGuides,
      };
    }

    const goVersionMatch = goModContent.match(/^go\s+([0-9.]+)/m);
    if (goVersionMatch && goVersionMatch[1]) {
      context.runtimeVersion = goVersionMatch[1];
    } else {
      try {
        const { stdout } = await sh("go version");
        const versionMatch = stdout.match(/go version go([0-9.]+\S*)/);
        if (versionMatch && versionMatch[1]) {
          context.runtimeVersion = versionMatch[1];
        }
      } catch (e) {
        // ignore, we'll proceed without the version
      }
    }

    try {
      const { stdout } = await sh(
        "go list -m -f '{{if not .Indirect}}{{.Path}} {{.Version}} {{.Dir}}{{end}}' all",
        { cwd: directory },
      );

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
    name: string,
  ): Promise<Package> {
    try {
      const { stdout: dir } = await sh(`go list -f '{{.Dir}}' -m ${name}`, {
        cwd: directory,
      });

      const packageDir = dir.trim();
      const guidesDir = join(packageDir, ".guides");

      return await Package.load(workspace, name, guidesDir);
    } catch (e) {
      throw new Error(`Could not find guides for package ${name}`);
    }
  }
}
