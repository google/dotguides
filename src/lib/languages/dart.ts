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
import { load } from "js-yaml";
import { Package } from "../package.js";
import type { LanguageAdapter, LanguageContext } from "../language-adapter.js";
import { existsAny, readAny } from "../file-utils.js";
import type { Workspace } from "../workspace.js";
import { cachedFetch } from "../cached-fetch.js";

const normalize = (pkg: string) =>
  pkg.startsWith("@") ? pkg.substring(1).replace("/", "__") : pkg;

export class DartLanguageAdapter implements LanguageAdapter {
  async discover(directory: string): Promise<LanguageContext> {
    const pubspecPath = await existsAny(directory, "pubspec.yaml");

    if (!pubspecPath) {
      return {
        detected: false,
        name: "dart",
        packages: [],
      };
    }

    const context: LanguageContext = {
      detected: true,
      name: "dart",
      packageManager: "pub",
      runtime: "dart",
      packages: [],
    };

    // Check pubspec.yaml for project metadata (Flutter detection, SDK version)
    const pubspecContent = await readAny(directory, "pubspec.yaml");
    let pubspec: any;
    if (pubspecContent) {
      try {
        pubspec = load(pubspecContent.content) as any;

        if (pubspec?.name) {
          const guidesDir = join(directory, ".guides");
          const hasGuides = !!(await existsAny(null, guidesDir));
          context.workspacePackage = {
            name: pubspec.name,
            packageVersion: pubspec.version || "0.0.0",
            dependencyVersion: pubspec.version || "0.0.0",
            dir: directory,
            guides: hasGuides,
          };
        }

        // Check for Flutter project
        if (pubspec?.dependencies?.flutter) {
          context.name = "flutter";
          context.runtime = "flutter";
        }

        // Get SDK version constraint
        if (pubspec?.environment?.sdk) {
          context.runtimeVersion = pubspec.environment.sdk;
        }
      } catch (e) {
        // Ignore YAML parsing errors for now
      }
    }

    const pubspecLockContent = await readAny(directory, "pubspec.lock");
    let pubspecLock: any;
    if (pubspecLockContent) {
      try {
        pubspecLock = load(pubspecLockContent.content);
      } catch (e) {
        // ignore
      }
    }

    // Use .dart_tool/package_config.json for canonical package list and locations
    const packages = await this._parsePackageConfig(directory);
    for (const pkg of packages) {
      const hasGuides = !!(await existsAny(null, ...pkg.guidesDirectories));
      const dependencyVersion =
        pubspec?.dependencies?.[pkg.name] ||
        pubspec?.dev_dependencies?.[pkg.name] ||
        "any";
      const packageVersion =
        pubspecLock?.packages?.[pkg.name]?.version || "unknown";
      const isDevDependency = !!pubspec?.dev_dependencies?.[pkg.name];

      context.packages.push({
        name: pkg.name,
        dir: pkg.rootPath,
        dependencyVersion,
        packageVersion,
        guides: hasGuides,
        development: isDevDependency,
        optional: false,
      });
    }

    return context;
  }

  async loadPackage(
    workspace: Workspace,
    directory: string,
    name: string,
  ): Promise<Package> {
    // Get package location from .dart_tool/package_config.json
    const packages = await this._parsePackageConfig(directory);

    // Find the specific package
    const pkg = packages.find((p) => p.name === name);
    if (!pkg) {
      throw new Error(
        `Package ${name} not found in .dart_tool/package_config.json`,
      );
    }

    // Find the first existing guides directory
    const pkgPath = await existsAny(null, ...pkg.guidesDirectories);

    if (pkgPath) {
      return await Package.load(workspace, name, pkgPath);
    }

    throw new Error(`Could not find guides for package ${name}`);
  }

  async discoverContrib(packages: string[]): Promise<string[]> {
    const discovered: string[] = [];
    const contribPath = process.env.DOTGUIDES_CONTRIB;

    if (contribPath) {
      for (const pkg of packages) {
        const contribDir = join(contribPath, "dart", normalize(pkg));
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

    // Check pub.dev for contrib packages
    const promises = packages.map(async (pkg) => {
      const url = `https://pub.dev/packages/dotguides_contrib_${normalize(
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

  private async _parsePackageConfig(directory: string): Promise<
    Array<{
      name: string;
      rootPath: string;
      guidesDirectories: string[];
    }>
  > {
    const packageConfigContent = await readAny(
      directory,
      ".dart_tool/package_config.json",
    );
    if (!packageConfigContent) {
      return [];
    }

    try {
      const packageConfig = JSON.parse(packageConfigContent.content);
      const packages = packageConfig.packages || [];

      return packages
        .filter((pkg: any) => pkg.name && pkg.rootUri)
        .map((pkg: any) => {
          // Convert file:// URI to local path
          const rootPath = pkg.rootUri.startsWith("file://")
            ? pkg.rootUri.substring(7) // Remove 'file://' prefix
            : pkg.rootUri;

          const guidesDir = join(rootPath, ".guides");

          // Also check for contrib packages (if this is a hosted package)
          const contribPackageName = `dotguides_contrib_${normalize(pkg.name)}`;
          const contribRootPath = rootPath.replace(
            `/${pkg.name}-`,
            `/${contribPackageName}-`,
          );
          const contribGuidesDir = join(contribRootPath, ".guides");

          return {
            name: pkg.name,
            rootPath,
            guidesDirectories: [guidesDir, contribGuidesDir],
          };
        });
    } catch (e) {
      return [];
    }
  }
}
