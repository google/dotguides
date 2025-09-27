import { Workspace } from "../../lib/workspace.js";
import {
  selectPackages,
  selectAgent,
  selectContextBudget,
} from "../../lib/interactive.js";
import { log, intro, outro } from "@clack/prompts";
import {
  readSettings,
  readWorkspaceSettings,
  writeWorkspaceSettings,
  type ContextBudget,
} from "../../lib/settings.js";
import { Package } from "../../lib/package.js";
import { ALL_AGENTS, detectAgent, findAgent } from "../../lib/agents/index.js";
import type { AgentAdapter } from "../../lib/agents/types.js";

export async function upCommand(options: {
  auto?: boolean;
  redo?: boolean;
}): Promise<void> {
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

  let selectedPackages: Package[] | null = enabledPackages;
  if (options.redo || newPackages.length > 0) {
    if (options.auto) {
      selectedPackages = enabledPackages;
    } else {
      selectedPackages = await selectPackages(
        allPackages,
        enabledPackages,
        newPackages,
      );
    }
  }

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

  let contextBudget = settings.contextBudget;
  if (!contextBudget || options.redo) {
    if (options.auto) {
      contextBudget = "medium";
    } else {
      const selectedBudget = await selectContextBudget(
        options.redo ? undefined : contextBudget,
      );
      if (!selectedBudget) {
        log.info("User cancelled operation.");
        return;
      }
      contextBudget = selectedBudget;
    }
  }
  workspaceSettings.contextBudget = contextBudget;

  await writeWorkspaceSettings(workspaceSettings);

  workspace.packageMap = selectedPackages.reduce(
    (acc, p) => {
      acc[p.name] = p;
      return acc;
    },
    {} as { [name: string]: Package },
  );

  let agent: AgentAdapter | null = settings.agent
    ? findAgent(settings.agent)
    : await detectAgent(workspaceDir);
  if (!agent || options.redo) {
    if (options.auto) {
      agent = ALL_AGENTS[0] || null;
    } else {
      agent = await selectAgent(ALL_AGENTS);
    }
  }

  if (!agent) {
    log.error("No coding agent selected. Exiting.");
    return;
  }

  workspaceSettings.agent = agent.name;

  if (!agent) {
    log.error("No coding agent selected. Exiting.");
    return;
  }

  log.info(`Configuring for ${agent.title}...`);

  const budgetMap: Record<ContextBudget, number> = {
    low: 5000,
    medium: 15000,
    high: 30000,
  };

  const instructions = await workspace.systemInstructions({
    listDocs: true,
    contextBudget: budgetMap[contextBudget],
  });
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

  await agent.up(workspaceDir, { instructions, mcpServers, contextBudget });

  outro("Dotguides is up!");
}
