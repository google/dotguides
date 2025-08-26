import { Workspace } from "../../lib/workspace.js";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export async function upCommand(): Promise<void> {
  const workspace = await Workspace.load([process.cwd()]);
  const mcpServers: { [key: string]: any } = {
    dotguides: {
      command: "dotguides",
      args: ["mcp"],
    },
  };

  for (const pkg of workspace.packages) {
    if (pkg.config?.mcpServers) {
      for (const serverName in pkg.config.mcpServers) {
        mcpServers[serverName] = pkg.config.mcpServers[serverName];
      }
    }
  }

  const extensionConfig = {
    name: "dotguides",
    version: "0.0.1",
    mcpServers,
    contextFileName: "GEMINI.md",
  };

  const extensionDir = join(
    process.cwd(),
    ".gemini",
    "extensions",
    "dotguides"
  );
  await mkdir(extensionDir, { recursive: true });

  await writeFile(
    join(extensionDir, "gemini-extension.json"),
    JSON.stringify(extensionConfig, null, 2)
  );

  const instructions = await workspace.systemInstructions({ listDocs: true });
  await writeFile(join(extensionDir, "GEMINI.md"), instructions);

  console.log(
    "Dotguides bootstrapped for Gemini CLI. You can now run `gemini`."
  );
}
