import { Workspace } from "../../lib/workspace.js";
import {
  selectPackages,
  selectAgent,
  selectContextBudget,
} from "../../lib/interactive.js";
import { log, intro, outro } from "@clack/prompts";
import {
  readSettings,
  writeWorkspaceSettings,
  type ContextBudget,
  type Settings,
} from "../../lib/settings.js";
import { Package } from "../../lib/package.js";
import { ALL_AGENTS, detectAgent, findAgent } from "../../lib/agents/index.js";
import type { AgentAdapter } from "../../lib/agents/types.js";

async function handlePackageSelection(
  workspace: Workspace,
  options: { auto?: boolean; redo?: boolean },
): Promise<Package[] | null> {
  const allPackages = workspace.packages;
  if (allPackages.length === 0) {
    log.warning("No packages with guidance found in the current workspace.");
    return [];
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
  return selectedPackages;
}

async function handleAgentSelection(
  workspaceDir: string,
  options: { auto?: boolean; redo?: boolean },
): Promise<AgentAdapter | null> {
  const settings = await readSettings();
  let agent: AgentAdapter | null = settings.agent
    ? findAgent(settings.agent)
    : await detectAgent(workspaceDir);

  if (!agent || options.redo) {
    if (options.auto) {
      agent = ALL_AGENTS[0] || null;
    } else {
      agent = await selectAgent(ALL_AGENTS, agent || undefined);
    }
  }
  return agent;
}

async function handleContextBudgetSelection(options: {
  auto?: boolean;
  redo?: boolean;
}): Promise<ContextBudget | null> {
  const settings = await readSettings();
  let contextBudget = settings.contextBudget;

  if (!contextBudget || options.redo) {
    if (options.auto) {
      contextBudget = "medium";
    } else {
      const selectedBudget = await selectContextBudget(
        options.redo ? undefined : contextBudget,
      );
      if (!selectedBudget) {
        return null;
      }
      contextBudget = selectedBudget;
    }
  }
  return contextBudget;
}

export async function upCommand(options: {
  auto?: boolean;
  redo?: boolean;
}): Promise<void> {
  intro(`Bringing dotguides up...`);

  const workspaceDir = process.cwd();
  const workspace = await Workspace.load([workspaceDir]);

  // 1. Select Packages
  const selectedPackages = await handlePackageSelection(workspace, options);
  if (selectedPackages === null) {
    log.info("User cancelled operation.");
    return;
  }

  // 2. Select Agent
  const agent = await handleAgentSelection(workspaceDir, options);
  if (!agent) {
    log.error("No coding agent selected. Exiting.");
    return;
  }
  log.info(`Configuring for ${agent.title}...`);

  // 3. Select Context Budget
  const contextBudget = await handleContextBudgetSelection(options);
  if (!contextBudget) {
    log.info("User cancelled operation.");
    return;
  }

  // 4. Save Settings
  const allPackageNames = workspace.packages.map((p) => p.name);
  const selectedPackageNames = selectedPackages.map((p) => p.name);
  const newlyDisabled = workspace.packages
    .filter((p) => !selectedPackageNames.includes(p.name))
    .map((p) => p.name);

  const workspaceSettings: Settings = {
    packages: {
      disabled: newlyDisabled,
      discovered: allPackageNames,
    },
    agent: agent.name,
    contextBudget: contextBudget,
  };
  await writeWorkspaceSettings(workspaceSettings);

  // 5. Update workspace and UP the agent
  workspace.packageMap = selectedPackages.reduce(
    (acc, p) => {
      acc[p.name] = p;
      return acc;
    },
    {} as { [name: string]: Package },
  );

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
