import { Workspace } from "../../lib/workspace.js";
import {
  selectPackages,
  selectAgent,
  selectContextBudget,
} from "../../lib/interactive.js";
import { log, intro, outro, text } from "@clack/prompts";
import {
  readSettings,
  writeWorkspaceSettings,
  type ContextBudget,
  type Settings,
} from "../../lib/settings.js";
import { Package } from "../../lib/package.js";
import { ALL_AGENTS, detectAgent, findAgent } from "../../lib/agents/index.js";
import type { AgentAdapter } from "../../lib/agents/types.js";
import { writeFile } from "fs/promises";
import path from "path";

async function handlePackageSelection(
  workspace: Workspace,
  options: { auto?: boolean; ask?: boolean },
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
  if (options.ask || newPackages.length > 0) {
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
  options: { auto?: boolean; ask?: boolean },
): Promise<AgentAdapter | "other" | null> {
  const settings = await readSettings();
  let agent: AgentAdapter | "other" | null = settings.agent
    ? findAgent(settings.agent)
    : await detectAgent(workspaceDir);

  if (!agent || options.ask) {
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
  ask?: boolean;
}): Promise<ContextBudget | null> {
  const settings = await readSettings();
  let contextBudget = settings.contextBudget;

  if (options.ask) {
    if (options.auto) {
      contextBudget = "medium";
    } else {
      const selectedBudget = await selectContextBudget(
        contextBudget || "medium",
      );
      if (!selectedBudget) {
        return null;
      }
      contextBudget = selectedBudget;
    }
  } else {
    if (!contextBudget) {
      contextBudget = "medium";
    }
  }
  return contextBudget;
}

export async function upCommand(options: {
  auto?: boolean;
  ask?: boolean;
}): Promise<void> {
  intro(`Bringing dotguides up...`);

  const workspaceDir = process.cwd();
  const workspace = await Workspace.load([workspaceDir]);

  if (workspace.packages.length === 0 && !options.ask) {
    log.info(
      "It looks like none of your dependencies have Dotguides guidance yet.",
    );
    return;
  }

  // 1. Select Packages
  const selectedPackages = await handlePackageSelection(workspace, options);
  if (selectedPackages === null) {
    log.info("User cancelled operation.");
    return;
  }

  // 2. Select Agent
  const agentResult = await handleAgentSelection(workspaceDir, options);
  if (!agentResult) {
    log.error("No coding agent selected. Exiting.");
    return;
  }

  // 3. Select Context Budget
  const contextBudget = await handleContextBudgetSelection(options);
  if (!contextBudget) {
    log.info("User cancelled operation.");
    return;
  }

  const budgetMap: Record<ContextBudget, number> = {
    low: 5000,
    medium: 15000,
    high: 30000,
  };
  const instructionOptions = {
    listDocs: true,
    contextBudget: budgetMap[contextBudget],
  };

  if (agentResult === "other") {
    const userPath = await text({
      message:
        "Enter a path to store Dotguides usage information. This context\n should be included in your agent's system prompt or rules files:",
      defaultValue: "DOTGUIDES.md",
      placeholder: "DOTGUIDES.md",
    });
    if (typeof userPath === "symbol") {
      return;
    }

    const instructions = await workspace.systemInstructions({
      selectedPackages,
      ...instructionOptions,
    });
    const mcpConfig = workspace.mcpConfig({ selectedPackages });

    const absPath = path.join(workspaceDir, userPath as string);
    await writeFile(absPath, instructions);
    log.info(`Wrote instructions to ${userPath}`);

    log.message("MCP Server Config:");
    console.log(JSON.stringify(mcpConfig, null, 2));

    outro("🟢 Dotguides is up! ✨");
    return;
  }

  const agent = agentResult;
  log.info(`Configuring for ${agent.title}...`);

  // 5. Save Settings
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

  // 6. Get Instructions and McpConfig and UP the agent
  const instructions = await workspace.systemInstructions({
    selectedPackages,
    ...instructionOptions,
  });
  const { mcpServers } = workspace.mcpConfig({ selectedPackages });
  await agent.up(workspaceDir, { instructions, mcpServers, contextBudget });

  if (!options.ask) {
    log.message(
      "Some options configured automatically, run `dotguides up --ask` for full config options.",
    );
  }

  outro("🟢 Dotguides is up! ✨");
}
