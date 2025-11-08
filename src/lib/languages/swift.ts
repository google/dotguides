
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { XcodeProject } from '@bacons/xcode';
import * as path from 'path';
import type { LanguageAdapter, LanguageContext, PackageInfo } from "../language-adapter.js";
import { Package } from "../package.js";
import { sh } from "../shell-utils.js";
import type { Workspace } from "../workspace.js";
import { existsAny } from "../file-utils.js";

export class SwiftLanguageAdapter implements LanguageAdapter {
  private derivedDataPath: string;
  private packageMap = new Map<string, PackageInfo>();

  constructor(derivedDataPath?: string) {
    this.derivedDataPath = derivedDataPath || join(process.env.HOME || '~', 'Library/Developer/Xcode/DerivedData');
  }
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
        const packageSwiftContents = await readFile(packageSwiftPath, "utf-8");

        const nameMatch = packageSwiftContents.match(/name: "([^"]+)"/);
        const packageName = nameMatch ? nameMatch[1] || 'unknown' : 'unknown';



        const workspacePackage: PackageInfo = {
          name: packageName,
          packageVersion: 'unknown',
          dependencyVersion: 'unknown',
          dir: directory,
          guides: !!(await existsAny(directory, ".guides")),
        };
        context.workspacePackage = workspacePackage;
        this.packageMap.set(workspacePackage.name, workspacePackage);

        const dependencyRegex = /.package\(url: "([^\)]+)",/g;
        let match;
        while ((match = dependencyRegex.exec(packageSwiftContents)) !== null) {
          const url = match[1];
          if (!url) continue;
          const name = url.substring(url.lastIndexOf('/') + 1).replace('.git', '');


          const pkg: PackageInfo = {
            name: name,
            dependencyVersion: 'unknown',
            packageVersion: 'unknown',
            dir: 'unknown', // We can't know the directory without resolving the package
            guides: false, // We can't know if there are guides without resolving the package
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
        const projectPath = join(directory, xcodeprojEntry.name, 'project.pbxproj');


        const project = XcodeProject.open(projectPath);
        const objects = project.toJSON().objects;

        const nativeTargets = Object.values(objects).filter((obj: any) => obj.isa === 'PBXNativeTarget');
        for (const target of nativeTargets) {
          const productDeps = (target as any).packageProductDependencies || [];
          for (const depId of productDeps) {
            const productDependency = objects[depId] as any;
            if (!productDependency) continue;

            const packageName = productDependency.productName;

            // Find the corresponding package reference to determine if it's local or remote
            const packageRefId = productDependency.package;
            const packageRef = objects[packageRefId] as any;

            let pkgPath: string;
            let name: string;

            // Find all local package references first
            const localPackageRefs = Object.values(objects).filter((obj: any) => obj.isa === 'XCLocalSwiftPackageReference');

            if (packageRef && packageRef.isa === 'XCRemoteSwiftPackageReference') {
              const url = (packageRef as any).repositoryURL;
              name = url.substring(url.lastIndexOf('/') + 1).replace('.git', '');

              const projectName = xcodeprojEntry.name.replace('.xcodeproj', '');
              pkgPath = await this.findPackagePath(name, projectName);
            } else {
              // Assume it's a local package. Find the corresponding reference.
              // This is a bit of a guess, as there's no direct link.
              const localRef = localPackageRefs.find((ref: any) => (productDependency as any).productName.startsWith(path.basename(ref.relativePath)));
              if (localRef) {
                const relativePath = (localRef as any).relativePath;
                pkgPath = join(directory, relativePath);
                name = path.basename(pkgPath);

              } else {
                // If we can't find a local reference, we'll have to fall back to searching DerivedData
                name = (productDependency as any).productName;

                const projectName = xcodeprojEntry.name.replace('.xcodeproj', '');
                pkgPath = await this.findPackagePath(name, projectName);
              }
            }

            const guidesDir = join(pkgPath, ".guides");
            const hasGuides = !!(await existsAny(null, guidesDir));
            const packageInfo: PackageInfo = {
              name: name,
              dependencyVersion: 'unknown',
              packageVersion: 'unknown',
              dir: pkgPath,
              guides: hasGuides,
            };
            context.packages.push(packageInfo);
            this.packageMap.set(packageInfo.name, packageInfo);
          }
        }
      } catch (e) {
        console.error(`Could not discover Xcode project dependencies:`, e);
      }
    }



    return context;
  }

  private async findPackagePath(name: string, projectName?: string): Promise<string> {
    console.log(`[Swift] Searching for package '${name}' in ${this.derivedDataPath}...`);

    try {
      let searchPath = this.derivedDataPath;
      if (projectName) {
        try {
          const { stdout: projectDerivedData } = await sh(`find "${this.derivedDataPath}" -maxdepth 1 -type d -name "${projectName}-*"`);
          const firstPath = projectDerivedData.trim().split('\n')[0];
          if (firstPath) {
            searchPath = join(firstPath, 'SourcePackages', 'checkouts');
          }
        } catch (e) {
          // Ignore if we can't find a project-specific path, we'll just search the whole directory
        }
      }

      const { stdout } = await sh(`find "${searchPath}" -maxdepth 1 -type d -name "${name}"`);
      const foundPath = stdout.trim();
      if (foundPath) {


        return foundPath;
      }
    } catch (e) {
      // find command fails if it doesn't find anything
    }


    return 'unknown';
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


