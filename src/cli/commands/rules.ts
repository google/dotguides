import { Workspace } from "../../lib/workspace.js";

export async function rulesCommand() {
  const workspace = await Workspace.load([process.cwd()]);

  if (Object.keys(workspace.packages).length === 0) {
    console.log("No .guides packages found in this workspace.");
    return;
  }
  for (const pkg of Object.values(workspace.packages)) {
    const styleGuide = pkg.guides["style"];
    if (styleGuide) {
      console.log(`--- Style Guide: ${pkg.name} ---`);
      console.log(await styleGuide.getContent());
      console.log("\n");
    }
  }
}
