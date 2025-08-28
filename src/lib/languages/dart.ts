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
    if (pubspecContent) {
      try {
        const pubspec = load(pubspecContent.content) as any;
        
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

    // Use pubspec.lock for formal dependency resolution

    const pubspecLockContent = await readAny(directory, "pubspec.lock");
    if (pubspecLockContent) {
      try {
        const lockFile = load(pubspecLockContent.content) as any;
        const dependencies = this._parseLockFileDependencies(lockFile);
        
        for (const dep of dependencies) {
          // Get all possible package directories for this dependency
          const packageDirectories = this._getPackageDirectories(
            { source: dep.source, version: dep.version, description: dep.path ? { path: dep.path } : undefined },
            dep.name
          );
          
          // Check if any of the directories exist
          if (packageDirectories.length > 0 && await existsAny(null, ...packageDirectories)) {
            context.packages.push(dep.name);
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return context;
  }

  async loadPackage(
    workspace: Workspace,
    directory: string,
    name: string
  ): Promise<Package> {
    // Get package version from pubspec.lock
    const pubspecLockContent = await readAny(directory, "pubspec.lock");
    if (!pubspecLockContent) {
      throw new Error(`Could not find pubspec.lock for package ${name}`);
    }

    try {
      const lockFile = load(pubspecLockContent.content) as any;
      const packageInfo = lockFile?.packages?.[name];
      
      if (!packageInfo) {
        throw new Error(`Package ${name} not found in pubspec.lock`);
      }

      const source = packageInfo.source;
      
      if (source !== 'hosted' && source !== 'path') {
        throw new Error(`Package ${name} has unsupported source type: ${source}`);
      }

      // Get all possible package directories for this dependency
      const packageDirectories = this._getPackageDirectories(packageInfo, name);
      
      // Find the first existing directory
      const pkgPath = await existsAny(null, ...packageDirectories);

      if (pkgPath) {
        return await Package.load(workspace, name, pkgPath);
      }

      throw new Error(`Could not find guides for package ${name}`);
    } catch (e) {
      throw new Error(`Could not load package ${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
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
      const url = `https://pub.dev/packages/dotguides_contrib_${normalize(pkg)}`;
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

    // Supports both 'hosted' packages from pub.dev and 'path' packages from local directories.
    // TODO: support additional source types like 'git' if needed.
    // Apparently there is no tooling to support package dependency=>cached package directory
    // resolution yet. So we manually implement the resolution logic here.
  private _getPackageDirectories(packageInfo: any, packageName: string): string[] {
    const directories: string[] = [];
    const source = packageInfo.source;
    
    if (source === 'hosted') {
      const version = packageInfo.version;
      const pubCache = process.env.PUB_CACHE || join(process.env.HOME || "~", ".pub-cache");
      
      // Main package directory
      const packageDir = join(pubCache, "hosted", "pub.dev", `${packageName}-${version}`);
      const guidesDir = join(packageDir, ".guides");
      directories.push(guidesDir);
      
      // Contrib package directory
      const contribPackageName = `dotguides_contrib_${normalize(packageName)}`;
      const contribPackageDir = join(pubCache, "hosted", "pub.dev", `${contribPackageName}-${version}`);
      const contribGuidesDir = join(contribPackageDir, ".guides");
      directories.push(contribGuidesDir);
      
    } else if (source === 'path') {
      const packagePath = packageInfo.description?.path;
      if (packagePath) {
        const guidesDir = join(packagePath, ".guides");
        directories.push(guidesDir);
      }
    }
    
    return directories;
  }

  private _parseLockFileDependencies(lockFile: any): Array<{
    name: string, 
    version: string, 
    source: string, 
    path?: string
  }> {
    const dependencies: Array<{
      name: string, 
      version: string, 
      source: string, 
      path?: string
    }> = [];
    
    if (lockFile?.packages && typeof lockFile.packages === 'object') {
      for (const [packageName, packageInfo] of Object.entries(lockFile.packages)) {
        const info = packageInfo as any;
        if (info?.version && info?.source) {
          const dep: {
            name: string, 
            version: string, 
            source: string, 
            path?: string
          } = {
            name: packageName,
            version: info.version,
            source: info.source
          };
          
          // For path-based packages, extract the path from description
          if (info.source === 'path' && info.description?.path) {
            dep.path = info.description.path;
          }
          
          dependencies.push(dep);
        }
      }
    }
    
    return dependencies;
  }
}
