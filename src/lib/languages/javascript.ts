import { join } from "path";
import { stat } from "fs/promises";
import { Package } from "../package.js";
import type { LanguageAdapter, LanguageContext } from "../language-adapter.js";
import { existsAny, readAny } from "../file-utils.js";
import type { Workspace } from "../workspace.js";
import { cachedFetch } from "../cached-fetch.js";

const normalize = (pkg: string) =>
  pkg.startsWith("@") ? pkg.substring(1).replace("/", "__") : pkg;

export class JavascriptLanguageAdapter implements LanguageAdapter {
  async discover(directory: string): Promise<LanguageContext> {
    const packageJsonPath = await existsAny(directory, "package.json");
    const tsconfigPath = await existsAny(directory, "tsconfig.json");

    if (!packageJsonPath) {
      return {
        detected: false,
        name: tsconfigPath ? "typescript" : "javascript",
        packages: [],
      };
    }

    const context: LanguageContext = {
      detected: true,
      name: tsconfigPath ? "typescript" : "javascript",
      packages: [],
    };

    const packageLock = await existsAny(
      directory,
      "pnpm-lock.yaml",
      "yarn.lock",
      "package-lock.json",
      "bun.lockb"
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
      ".node-version"
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

    const packageJsonContent = await readAny(directory, "package.json");
    if (!packageJsonContent) {
      // should not happen based on early return
      return context;
    }
    const packageJson = JSON.parse(packageJsonContent.content);
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    const optionalDependencies = packageJson.optionalDependencies || {};

    const allDeps = {
      ...dependencies,
      ...devDependencies,
      ...optionalDependencies,
    };

    for (const name in allDeps) {
      const packagePath = join(directory, "node_modules", name);
      const guidesDir = join(packagePath, ".guides");
      const contribPackagePath = join(
        directory,
        "node_modules",
        `@dotguides-contrib/${normalize(name)}`
      );
      const hasGuides = !!(await existsAny(
        null,
        guidesDir,
        contribPackagePath
      ));

      const dependencyVersion = allDeps[name];
      let packageVersion = dependencyVersion;

      const installedPackageJsonContent = await readAny(
        packagePath,
        "package.json"
      );
      if (installedPackageJsonContent) {
        try {
          const installedPackageJson = JSON.parse(
            installedPackageJsonContent.content
          );
          packageVersion = installedPackageJson.version;
        } catch (e) {
          // ignore
        }
      }

      context.packages.push({
        name,
        dir: packagePath,
        dependencyVersion,
        packageVersion,
        guides: hasGuides,
        development: name in devDependencies,
        optional: name in optionalDependencies,
      });
    }

    return context;
  }

  async loadPackage(
    workspace: Workspace,
    directory: string,
    name: string
  ): Promise<Package> {
    const packagePath = join("node_modules", name);
    const guidesDir = join(packagePath, ".guides");
    const contribPackageName = name.startsWith("@")
      ? name.substring(1).replace("/", "__")
      : name;
    const contribPackagePath = join(
      "node_modules",
      `@dotguides-contrib/${contribPackageName}`
    );

    const pkgPath = await existsAny(directory, guidesDir, contribPackagePath);
    if (pkgPath) {
      return await Package.load(workspace, name, pkgPath);
    }

    throw new Error(
      `Could not find guides for package '${name}' in directory '${directory}'`
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
        pkg
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
