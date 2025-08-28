import { Workspace } from "../../lib/workspace.js";

export async function rulesCommand() {
  const workspace = await Workspace.load([process.cwd()]);
  console.log(await workspace.systemInstructions({ listDocs: true }));
}
