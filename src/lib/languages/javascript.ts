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

import { join } from "path";
import { stat } from "fs/promises";
import { Package } from "../package.js";
import type {
  LanguageAdapter,
  LanguageContext,
  PackageInfo,
} from "../language-adapter.js";
import { existsAny, readAny } from "../file-utils.js";
import type { Workspace } from "../workspace.js";
import { cachedFetch } from "../cached-fetch.js";

const normalize = (pkg: string) =>
  pkg.startsWith("@") ? pkg.substring(1).replace("/", "__") : pkg;

const sortPackages = (
  packages: (PackageInfo & { deps: string[] })[],
): PackageInfo[] => {
  const packageMap = new Map(packages.map((p) => [p.name, p]));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const pkg of packages) {
    inDegree.set(pkg.name, 0);
    adj.set(pkg.name, []);
  }

  for (const pkg of packages) {
    for (const depName of pkg.deps) {
      if (packageMap.has(depName)) {
        // pkg depends on depName, so edge from depName -> pkg
        adj.get(depName)!.push(pkg.name);
        inDegree.set(pkg.name, (inDegree.get(pkg.name) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const pkg of packages) {
    if (inDegree.get(pkg.name) === 0) {
      queue.push(pkg.name);
    }
  }

  const normalizeName = (name: string) =>
    name.startsWith("@") ? name.substring(1) : name;
  const compareNames = (a: string, b: string) =>
    normalizeName(a).localeCompare(normalizeName(b));

  queue.sort(compareNames);

  const sorted: PackageInfo[] = [];
  while (queue.length > 0) {
    const pkgName = queue.shift()!;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deps, ...pkgInfo } = packageMap.get(pkgName)!;
    sorted.push(pkgInfo);

    const dependents = adj.get(pkgName) || [];
    dependents.sort(compareNames);

    for (const dependentName of dependents) {
      inDegree.set(dependentName, inDegree.get(dependentName)! - 1);
      if (inDegree.get(dependentName) === 0) {
        queue.push(dependentName);
      }
    }
    queue.sort(compareNames);
  }

  if (sorted.length < packages.length) {
    const remaining = packages
      .filter((p) => !sorted.find((sp) => sp.name === p.name))
      .sort((a, b) => compareNames(a.name, b.name));
    for (const pkg of remaining) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { deps, ...pkgInfo } = pkg;
      sorted.push(pkgInfo);
    }
  }

  return sorted;
};

export class JavascriptLanguageAdapter implements LanguageAdapter {
  async discover(directory: string): Promise<LanguageContext> {
    const packageJsonPath = await existsAny(directory, "package.json");
    const tsconfigPath = await existsAny(directory, "tsconfig.json");

    const packageJsonContent = await readAny(directory, "package.json");

    if (!packageJsonPath || !packageJsonContent) {
      return {
        detected: false,
        name: tsconfigPath ? "typescript" : "javascript",
        packages: [],
      };
    }
    const packageJson = JSON.parse(packageJsonContent.content);

    const context: LanguageContext = {
      detected: true,
      name: tsconfigPath ? "typescript" : "javascript",
      packages: [],
    };
    const guidesDir = join(directory, ".guides");
    const hasGuides = !!(await existsAny(null, guidesDir));
    context.workspacePackage = {
      name: packageJson.name,
      packageVersion: packageJson.version,
      dependencyVersion: packageJson.version,
      dir: directory,
      guides: hasGuides,
    };

    const packageLock = await existsAny(
      directory,
      "pnpm-lock.yaml",
      "yarn.lock",
      "package-lock.json",
      "bun.lockb",
    );

    if (packageLock) {
      if (packageLock.endsWith("pnpm-lock.yaml")) {
        context.packageManager = "pnpm";
      } else if (packageLock.endsWith("yarn.lock")) {
        context.packageManager = "yarn";
      } else if (packageLock.endsWith("package-lock.json")) {
        context.packageManager = "npm";
      } else if (packageLock.endsWith("bun.lockb")) {
        context.packageManager = "bun";
      }
    }

    const runtimeFile = await existsAny(
      directory,
      "bun.lockb",
      "deno.json",
      ".nvmrc",
      ".node-version",
    );

    if (runtimeFile) {
      if (runtimeFile.endsWith("bun.lockb")) {
        context.runtime = "bun";
      } else if (runtimeFile.endsWith("deno.json")) {
        context.runtime = "deno";
      } else {
        context.runtime = "nodejs";
      }
    } else {
      context.runtime = "nodejs";
    }

    const versionFile = await readAny(directory, ".nvmrc", ".node-version");
    if (versionFile) {
      context.runtimeVersion = versionFile.content.trim();
    }

    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    const optionalDependencies = packageJson.optionalDependencies || {};

    const allDeps = {
      ...dependencies,
      ...devDependencies,
      ...optionalDependencies,
    };

    const packagesWithDeps: (PackageInfo & { deps: string[] })[] = [];

    for (const name in allDeps) {
      const packagePath = join(directory, "node_modules", name);
      const guidesDir = join(packagePath, ".guides");
      const contribPackagePath = join(
        directory,
        "node_modules",
        `@dotguides-contrib/${normalize(name)}`,
      );
      const hasGuides = !!(await existsAny(
        null,
        guidesDir,
        contribPackagePath,
      ));

      const dependencyVersion = allDeps[name];
      let packageVersion = dependencyVersion;
      let deps: string[] = [];

      const installedPackageJsonContent = await readAny(
        packagePath,
        "package.json",
      );
      if (installedPackageJsonContent) {
        try {
          const installedPackageJson = JSON.parse(
            installedPackageJsonContent.content,
          );
          packageVersion = installedPackageJson.version;
          deps = [
            ...Object.keys(installedPackageJson.dependencies || {}),
            ...Object.keys(installedPackageJson.peerDependencies || {}),
          ];
        } catch (e) {
          // ignore
        }
      }

      packagesWithDeps.push({
        name,
        dir: packagePath,
        dependencyVersion,
        packageVersion,
        guides: hasGuides,
        development: name in devDependencies,
        optional: name in optionalDependencies,
        deps,
      });
    }

    context.packages = sortPackages(packagesWithDeps);

    return context;
  }

  async loadPackage(
    workspace: Workspace,
    directory: string,
    name: string,
  ): Promise<Package> {
    const packagePath = join(directory, "node_modules", name);
    const guidesDir = join(packagePath, ".guides");
    const contribPackageName = name.startsWith("@")
      ? name.substring(1).replace("/", "__")
      : name;
    const contribPackagePath = join(
      directory,
      "node_modules",
      `@dotguides-contrib/${contribPackageName}`,
    );

    const pkgPath = await existsAny(null, guidesDir, contribPackagePath);
    if (pkgPath) {
      return await Package.load(workspace, name, pkgPath);
    }

    throw new Error(
      `Could not find guides for dependency package '${name}' in directory '${directory}'`,
    );
  }

  async discoverContrib(packages: string[]): Promise<string[]> {
    const discovered: string[] = [];
    const contribPath = process.env.DOTGUIDES_CONTRIB;
    if (contribPath) {
      for (const pkg of packages) {
        const contribDir = join(contribPath, "js", normalize(pkg));
        try {
          const stats = await stat(contribDir);
          if (stats.isDirectory()) {
            discovered.push(`file:${contribDir}`);
          }
        } catch (e) {
          // ignore
        }
      }
      return discovered;
    }

    const promises = packages.map(async (pkg) => {
      const url = `https://registry.npmjs.org/@dotguides-contrib/${normalize(
        pkg,
      )}`;
      try {
        const res = await cachedFetch(url, { method: "HEAD" });
        if (res.ok) {
          return pkg;
        }
      } catch (e) {
        // ignore
      }
      return null;
    });

    return (await Promise.all(promises)).filter((p): p is string => p !== null);
  }
}
