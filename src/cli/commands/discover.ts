import { Workspace } from "../../lib/workspace.js";

export async function discoverCommand() {
  const workspace = await Workspace.load([process.cwd()]);

  if (Object.keys(workspace.packageMap).length === 0) {
    console.log("No .guides packages found in this workspace.");
    return;
  }

  console.log("Discovered .guides packages:");

  for (const pkg of Object.values(workspace.packageMap)) {
    const guideCount = pkg.guides.length;
    const docCount = pkg.docs.length;
    const commandCount = pkg.commands.length;

    const parts: string[] = [];
    if (guideCount > 0) {
      parts.push(`${guideCount} guides`);
    }
    if (docCount > 0) {
      parts.push(`${docCount} docs`);
    }
    if (commandCount > 0) {
      parts.push(`commands: ${commandCount > 0 ? "" : " (none)"}`);
    }

    console.log(
      `- ${pkg.name}${parts.length > 0 ? `: ${parts.join(", ")}` : ""}`
    );

    if (pkg.commands.length > 0) {
      for (const command of pkg.commands) {
        console.log(`    ${command.signature}`);
      }
    }
  }
}
