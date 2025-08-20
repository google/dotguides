import { join } from "path";
import { Package } from "../package.js";
import type { LanguageAdapter, LanguageContext } from "../language-adapter.js";
import { existsAny, readAny } from "../file-utils.js";

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
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const name in dependencies) {
      const packagePath = join("node_modules", name);
      const guidesDir = join(packagePath, ".guides");
      const contribPackageName = name.startsWith("@")
        ? name.substring(1).replace("/", "__")
        : name;
      const contribPackagePath = join(
        "node_modules",
        `@dotguides-contrib/${contribPackageName}`
      );
      if (await existsAny(directory, guidesDir, contribPackagePath)) {
        context.packages.push(name);
      }
    }

    return context;
  }

  async loadPackage(directory: string, name: string): Promise<Package> {
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
      return await Package.load(name, pkgPath);
    }

    throw new Error(`Could not find guides for package ${name}`);
  }
}
