import { readFile, stat } from "fs/promises";
import { basename, join } from "path";
import { Package } from "../../lib/package.js";
import { Workspace } from "../../lib/workspace.js";
import { countTokens, formatTokenCount } from "../../lib/render-utils.js";
import { existsSync } from "fs";

export async function inspectCommand(packageName: string | undefined) {
  let pkg: Package | undefined;

  if (packageName) {
    const workspace = await Workspace.load([process.cwd()]);
    pkg = workspace.packageMap[packageName];
  } else {
    try {
      console.log(process.cwd(), existsSync(join(process.cwd(), ".guides")));
      if (existsSync(join(process.cwd(), ".guides"))) {
        let name = basename(process.cwd());
        try {
          const packageJsonContent = await readFile("package.json", "utf-8");
          name = JSON.parse(packageJsonContent).name;
        } catch {
          // ignore, use directory name
        }
        const workspace = await Workspace.load([process.cwd()]);
        pkg = await Package.load(workspace, name, ".guides");
      }
    } catch (e) {
      console.error(e);
      console.error(
        "Package name is required, or run from a directory with a .guides folder."
      );
      process.exit(1);
    }
  }

  if (!pkg) {
    console.error(`Package "${packageName || "."}" not found.`);
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
      console.log(`    - ${command.config.name}`);
    }
  }
}
