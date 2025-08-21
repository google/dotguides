import { readFile, stat } from "fs/promises";
import { basename } from "path";
import { Package } from "../../lib/package.js";
import { Workspace } from "../../lib/workspace.js";
import { countTokens, formatTokenCount } from "../../lib/render-utils.js";

export async function inspectCommand(packageName: string | undefined) {
  let pkg: Package | undefined;

  if (packageName) {
    const workspace = await Workspace.load([process.cwd()]);
    pkg = workspace.packageMap[packageName];
  } else {
    try {
      await stat(".guides");
      let name = basename(process.cwd());
      try {
        const packageJsonContent = await readFile("package.json", "utf-8");
        name = JSON.parse(packageJsonContent).name;
      } catch {
        // ignore, use directory name
      }
      pkg = await Package.load(name, ".guides");
    } catch (e) {
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

  if (Object.keys(pkg.guides).length > 0) {
    console.log("  Guides:");
    for (const guideName of Object.keys(
      pkg.guides
    ) as (keyof typeof pkg.guides)[]) {
      const guide = pkg.guides[guideName];
      if (!guide) continue;
      const tokens = countTokens(guide.content);
      console.log(`    - ${guideName} (~${formatTokenCount(tokens)} tokens)`);
    }
  }

  if (pkg.docs.length > 0) {
    const totalTokens = pkg.docs.reduce(
      (acc, doc) => acc + countTokens(doc.content),
      0
    );
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
