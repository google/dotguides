import { Workspace } from "../../lib/workspace.js";
import { readSettings, type ContextBudget } from "../../lib/settings.js";
import { Package } from "../../lib/package.js";
import { findAgent } from "../../lib/agents/index.js";

export async function hookCommand(options?: { agent?: string }): Promise<void> {
  const workspaceDir = process.cwd();
  const workspace = await Workspace.load([workspaceDir]);

  const settings = await readSettings();
  const disabledPackages = settings.packages?.disabled || [];
  const enabledPackages = workspace.packages.filter(
    (p) => !disabledPackages.includes(p.name),
  );

  workspace.packageMap = enabledPackages.reduce(
    (acc, p) => {
      acc[p.name] = p;
      return acc;
    },
    {} as { [name: string]: Package },
  );

  const contextBudget: ContextBudget = settings.contextBudget || "medium";
  const budgetMap: Record<ContextBudget, number> = {
    low: 5000,
    medium: 15000,
    high: 30000,
  };

  const instructions = await workspace.systemInstructions({
    listDocs: true,
    contextBudget: budgetMap[contextBudget],
  });

  if (options?.agent) {
    const agent = findAgent(options.agent);
    if (agent?.hook) {
      const output = await agent.hook(instructions, enabledPackages);
      process.stdout.write(output);
      return;
    }
  }

  process.stdout.write(instructions);
}
