import { Workspace } from "../../lib/workspace.js";
import { selectPackages, selectAgent } from "../../lib/interactive.js";
import { log, intro, outro } from "@clack/prompts";
import {
  readSettings,
  readWorkspaceSettings,
  writeWorkspaceSettings,
} from "../../lib/settings.js";
import { Package } from "../../lib/package.js";
import { ALL_AGENTS, detectAgent } from "../../lib/agents/index.js";

export async function upCommand(): Promise<void> {
  intro(`Bringing dotguides up...`);

  const workspaceDir = process.cwd();
  const workspace = await Workspace.load([workspaceDir]);
  const allPackages = workspace.packages;
  const allPackageNames = allPackages.map((p) => p.name);

  if (allPackages.length === 0) {
    log.warning("No packages with guidance found in the current workspace.");
  }

  const settings = await readSettings();
  const disabledPackages = settings.packages?.disabled || [];
  const previouslyDiscovered = settings.packages?.discovered || [];

  const newPackages = allPackages.filter(
    (p) => !previouslyDiscovered.includes(p.name),
  );

  const enabledPackages = allPackages.filter(
    (p) => !disabledPackages.includes(p.name),
  );

  const selectedPackages = await selectPackages(
    allPackages,
    enabledPackages,
    newPackages,
  );

  if (selectedPackages === null) {
    log.info("User cancelled operation.");
    return;
  }

  const selectedPackageNames = selectedPackages.map((p) => p.name);
  const newlyDisabled = allPackages
    .filter((p) => !selectedPackageNames.includes(p.name))
    .map((p) => p.name);

  const workspaceSettings = await readWorkspaceSettings();
  workspaceSettings.packages ??= {};
  workspaceSettings.packages.disabled = newlyDisabled;
  workspaceSettings.packages.discovered = allPackageNames;
  await writeWorkspaceSettings(workspaceSettings);

  workspace.packageMap = selectedPackages.reduce(
    (acc, p) => {
      acc[p.name] = p;
      return acc;
    },
    {} as { [name: string]: Package },
  );

  let agent = await detectAgent(workspaceDir);
  if (!agent) {
    agent = (await selectAgent(ALL_AGENTS)) || null;
  }

  if (!agent) {
    log.error("No coding agent selected. Exiting.");
    return;
  }

  log.info(`Configuring for ${agent.name()}...`);

  const instructions = await workspace.systemInstructions({ listDocs: true });
  const mcpServers: { [key: string]: any } = {
    dotguides: {
      command: "dotguides",
      args: ["mcp"],
    },
  };

  for (const pkg of selectedPackages) {
    if (pkg.config?.mcpServers) {
      for (const serverName in pkg.config.mcpServers) {
        mcpServers[serverName] = pkg.config.mcpServers[serverName];
      }
    }
  }

  await agent.up(workspaceDir, { instructions, mcpServers });

  outro("Dotguides is up!");
}
