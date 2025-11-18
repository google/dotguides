import { Package } from "./package.js";
import { countTokens } from "./render-utils.js";

export interface TokenBudgetStats {
  usage: number;
  style: number;
  docs: number;
  clerical: number;
  total: number;
}

export async function calculateTokenBudget(
  pkg: Package,
): Promise<TokenBudgetStats> {
  const usageGuide = pkg.guides.find((g) => g.config.name === "usage");
  const styleGuide = pkg.guides.find((g) => g.config.name === "style");

  const usageBlocks = usageGuide ? await usageGuide.render() : [];
  const styleBlocks = styleGuide ? await styleGuide.render() : [];

  const usage = countTokens(usageBlocks);
  const style = countTokens(styleBlocks);

  const docsList = pkg.getDocsList();
  const docsString = docsList.join("\n");
  const docs = Math.round(docsString.length / 4);

  // Calculate total system prompt tokens with infinite budget to get everything included
  const fullSystemPrompt = await pkg.systemInstructions({
    tokenBudget: Infinity,
  });
  const totalSystemTokens = Math.round(fullSystemPrompt.length / 4);

  // Clerical is the overhead not accounted for by the raw content of usage, style, and docs list
  // This includes XML tags, extra newlines, etc.
  // We calculate it by subtracting the known components from the total.
  // Note: The totalSystemTokens is an approximation based on char count / 4,
  // and our component counts are also approximations.
  // To be safe and avoid negative numbers if approximations drift, we floor at 0.
  const clerical = Math.max(0, totalSystemTokens - (usage + style + docs));

  return {
    usage,
    style,
    docs,
    clerical,
    total: totalSystemTokens,
  };
}
