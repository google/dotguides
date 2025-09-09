import { readFile } from "fs/promises";
import { basename, join, resolve } from "path";
import { Package } from "../../lib/package.js";
import { Workspace } from "../../lib/workspace.js";
import { countTokens, formatTokenCount } from "../../lib/render-utils.js";
import { existsSync } from "fs";
import { detectLanguage } from "../../lib/language.js";

export async function inspectCommand(packageNameOrPath: string | undefined) {
  let pkg: Package | undefined;
  const loadPath = packageNameOrPath
    ? resolve(process.cwd(), packageNameOrPath)
    : process.cwd();

  if (packageNameOrPath && !existsSync(loadPath)) {
    const workspace = await Workspace.load([process.cwd()]);
    pkg = workspace.packageMap[packageNameOrPath];
  } else {
    const [adapter, context] = await detectLanguage(loadPath);
    if (adapter && context) {
      const workspace = new Workspace([loadPath]);
      workspace.languages.push(context);
      let name = basename(loadPath);
      try {
        const packageJsonContent = await readFile(
          join(loadPath, "package.json"),
          "utf-8"
        );
        name = JSON.parse(packageJsonContent).name;
      } catch {
        // ignore, use directory name
      }
      pkg = await adapter.loadPackage(workspace, loadPath, name);
      workspace.packageMap[pkg.name] = pkg;
    } else {
      console.error(
        `Could not determine language for directory ${loadPath}. No dotguides-compatible language detected.`
      );
      process.exit(1);
    }
  }

  if (!pkg) {
    console.error(`Package "${packageNameOrPath || "."}" not found.`);
    process.exit(1);
  }

  console.log(`Inspecting package: ${pkg.name}`);

  console.log("\nFeatures:");

  if (pkg.guides.length > 0) {
    console.log("  Guides:");
    for (const guide of pkg.guides) {
      const content = await guide.render();
      const tokens = countTokens(content);
      console.log(
        `    - ${guide.config.name} (~${formatTokenCount(tokens)} tokens)`
      );
    }
  }

  if (pkg.docs.length > 0) {
    let totalTokens = 0;
    for (const doc of pkg.docs) {
      const content = await doc.content;
      totalTokens += countTokens(content);
    }
    console.log(
      `  Docs: ${pkg.docs.length} discovered (~${formatTokenCount(
        totalTokens
      )} tokens)`
    );
    const topLevelDocs = pkg.docs.filter(
      (doc) => !doc.config.name.includes("/")
    );
    for (const doc of topLevelDocs) {
      let line = `    - ${doc.config.name}`;
      if (doc.description) {
        line += `: ${doc.description}`;
      }
      console.log(line);
    }
    const subDirDocs: Record<string, number> = {};
    for (const doc of pkg.docs) {
      if (doc.config.name.includes("/")) {
        const dir = doc.config.name.split("/")[0];
        if (dir) {
          subDirDocs[dir] = (subDirDocs[dir] || 0) + 1;
        }
      }
    }
    for (const [dir, count] of Object.entries(subDirDocs)) {
      console.log(`    - ${dir}/ (${count} docs)`);
    }
  }

  if (pkg.commands.length > 0) {
    console.log("  Commands:");
    for (const command of pkg.commands) {
      console.log(`    - ${command.signature}`);
    }
  }
}
