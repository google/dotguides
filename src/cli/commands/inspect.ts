import { Workspace } from "../../lib/workspace.js";

export async function inspectCommand(packageName: string | undefined) {
  if (!packageName) {
    console.error("Package name is required.");
    process.exit(1);
  }

  const workspace = await Workspace.load([process.cwd()]);

  const pkg = workspace.packages[packageName];

  if (!pkg) {
    console.error(`Package "${packageName}" not found.`);
    process.exit(1);
  }

  console.log(`Inspecting package: ${pkg.name}`);

  console.dir(pkg, { depth: null });

  console.log("\nFeatures:");

  if (Object.keys(pkg.guides).length > 0) {
    console.log("  Guides:");
    for (const guideName of Object.keys(pkg.guides)) {
      console.log(`    - ${guideName}`);
    }
  }

  if (pkg.docs.length > 0) {
    console.log("  Docs:");
    for (const doc of pkg.docs) {
      console.log(`    - ${doc.config.name}`);
    }
  }

  if (pkg.commands.length > 0) {
    console.log("  Commands:");
    for (const command of pkg.commands) {
      console.log(`    - ${command.config.name}`);
    }
  }
}
