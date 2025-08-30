import { Workspace } from "../../lib/workspace.js";

export async function discoverCommand() {
  const workspace = await Workspace.load([process.cwd()]);

  if (Object.keys(workspace.packageMap).length === 0) {
    console.log("No .guides packages found in this workspace.");
    return;
  }

  console.log("Discovered .guides packages:");

  for (const pkg of Object.values(workspace.packageMap)) {
    console.log(`- ${pkg.name}`);
    if (pkg.commands.length > 0) {
      for (const command of pkg.commands) {
        console.log(`    ${command.signature}`);
      }
    }
  }
}
