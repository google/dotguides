
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { LanguageAdapter, LanguageContext, PackageInfo } from "../language-adapter.js";
import { Package } from "../package.js";
import { sh } from "../shell-utils.js";
import type { Workspace } from "../workspace.js";
import { existsAny } from "../file-utils.js";

export class SwiftLanguageAdapter implements LanguageAdapter {
  private packageMap = new Map<string, PackageInfo>();
  get language(): string {
    return "swift";
  }

  async discover(directory: string): Promise<LanguageContext> {
    const packageSwiftPath = await existsAny(directory, "Package.swift");
    const entries = await readdir(directory, { withFileTypes: true });
    const xcodeprojEntry = entries.find((e) => e.isDirectory() && e.name.endsWith(".xcodeproj"));

    if (!packageSwiftPath && !xcodeprojEntry) {
      return {
        name: "Swift",
        detected: false,
        packages: [],
      };
    }

    this.packageMap.clear();
    const context: LanguageContext = {
      detected: true,
      name: "swift",
      packages: [],
    };

    if (packageSwiftPath) {
      try {
        const { stdout } = await sh("swift package dump-package", { cwd: directory });
        const { stdout: packageDataJson } = await sh("swift package dump-package", { cwd: directory });
        const packageData = JSON.parse(packageDataJson);
        const workspacePackage: PackageInfo = {
          name: packageData.name,
          packageVersion: packageData.version || "unknown",
          dependencyVersion: packageData.version || "unknown",
          dir: directory,
          guides: !!(await existsAny(directory, ".guides")),
        };
        context.workspacePackage = workspacePackage;
        this.packageMap.set(workspacePackage.name, workspacePackage);

        const { stdout: depsStdout } = await sh("swift package show-dependencies --format json", { cwd: directory });
        const depsData = JSON.parse(depsStdout);

        const depMap = new Map<string, { path: string; version: string }>();
        const collectDeps = (node: any) => {
          if (!node) return;
          depMap.set(node.name, { path: node.path, version: node.version });
          if (node.dependencies) {
            for (const dep of node.dependencies) {
              collectDeps(dep);
            }
          }
        };
        collectDeps(depsData);

        const dependencies = packageData.dependencies || [];
        for (const [name, dep] of depMap.entries()) {
          const depPath = dep.path || "unknown";
          const guidesDir = join(depPath, ".guides");
          const hasGuides = !!(await existsAny(null, guidesDir));

          const pkg: PackageInfo = {
            name: name,
            dependencyVersion: dep.version || "unknown",
            packageVersion: dep.version || "unknown",
            dir: depPath,
            guides: hasGuides,
          };
          context.packages.push(pkg);
          this.packageMap.set(pkg.name, pkg);
        }
      } catch (e) {
        console.error(`Could not discover Swift packages:`, e);
      }
    }

    if (xcodeprojEntry) {
      try {
        const { stdout: resolveOutput } = await sh(`xcodebuild -resolvePackageDependencies -project ${xcodeprojEntry.name}`, { cwd: directory });
        const resolvedPackagesSectionRegex = /Resolved source packages:([\s\S]*?)(?:\n\n|resolved source packages:|$)/;
        const resolvedPackagesMatch = resolveOutput.match(resolvedPackagesSectionRegex);

        if (resolvedPackagesMatch && resolvedPackagesMatch[1]) {
          const packageSection = resolvedPackagesMatch[1];
          const packageRegex = /^\s*([^:\s]+):\s+([^\s]+)\s+@\s+(.*)$/gm;
          let match;
          while ((match = packageRegex.exec(packageSection)) !== null) {
            const name = match[1];
            const location = match[2];

            if (!name || !location) {
              continue;
            }

            let pkgPath: string;
            if (location.startsWith('/')) {
              pkgPath = location;
            } else {
              const projectName = xcodeprojEntry.name.replace(".xcodeproj", "");
              const { stdout: derivedDataPath } = await sh(`/usr/bin/find ~/Library/Developer/Xcode/DerivedData -name "${projectName}-*" -maxdepth 1 -type d 2>/dev/null | head -n 1 | while read path; do echo "$path/SourcePackages/checkouts"; done`, { cwd: directory });
              const checkoutsPath = derivedDataPath.trim();
              if (checkoutsPath) {
                pkgPath = join(checkoutsPath, name);
              } else {
                continue;
              }
            }

            const guidesDir = join(pkgPath, ".guides");
            const hasGuides = !!(await existsAny(null, guidesDir));
            const pkg: PackageInfo = {
              name: name,
              dependencyVersion: "unknown",
              packageVersion: "unknown",
              dir: pkgPath,
              guides: hasGuides,
            };
            context.packages.push(pkg);
            this.packageMap.set(pkg.name, pkg);
          }
        }
      } catch (e) {
        console.error(`Could not discover Xcode project dependencies:`, e);
      }
    }

    return context;
  }

  async loadPackage(workspace: Workspace, directory: string, name: string): Promise<Package> {
    const pkgInfo = this.packageMap.get(name);
    if (pkgInfo && pkgInfo.dir !== "unknown") {
      const guidesDir = join(pkgInfo.dir, ".guides");
      if (await existsAny(null, guidesDir)) {
        return await Package.load(workspace, name, guidesDir);
      }
    }

    throw new Error(`Could not find guides for Swift package '${name}'.`);
  }
}


