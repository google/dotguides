#!/usr/bin/env node

import { parseArgs } from "util";
import { fileURLToPath } from "url";
import { resolve } from "path";
import { createCommand } from "./commands/create.js";
import { discoverCommand } from "./commands/discover.js";
import { inspectCommand } from "./commands/inspect.js";
import { rulesCommand } from "./commands/rules.js";
import { initCommand } from "./commands/init.js";
import { mcpCommand } from "./commands/mcp.js";
import { upCommand } from "./commands/up.js";
import { checkCommand } from "./commands/check.js";

export async function runCli(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv.slice(2),
    options: {
      help: {
        type: "boolean",
        short: "h",
      },
      workspace: {
        type: "string",
        short: "w",
      },
    },
    allowPositionals: true,
    strict: false,
  });

  const command = positionals[0];

  if (values.help || !command) {
    console.log("Usage: dotguides <command> [options]");
    console.log("");
    console.log("Commands:");
    console.log("  mcp\t\tStart the MCP server");
    console.log("  check\t\tCheck the current directory for dotguides content");
    console.log("  discover\tDiscover .guides content in the workspace");
    console.log("  inspect\tInspect a specific .guides package");
    console.log("  rules\t\tOutput the rules for the workspace");
    console.log("  create\tCreate a new .guides directory with default files");
    console.log("  init\t\tInitialize a new .guides package");
    console.log("  up\t\tBootstrap Gemini CLI to use dotguides");
    return;
  }

  switch (command) {
    case "check":
      await checkCommand();
      break;
    case "discover":
      await discoverCommand();
      break;
    case "inspect":
      if (!positionals[1]) {
        console.error("Usage: dotguides inspect <package-name>");
        process.exit(1);
      }
      await inspectCommand(positionals[1]);
      break;
    case "rules":
      await rulesCommand();
      break;
    case "init":
      await initCommand();
      break;
    case "create":
      await createCommand();
      break;
    case "up":
      await upCommand();
      break;
    case "mcp":
      const workspace =
        typeof values.workspace === "string" ? [values.workspace] : undefined;
      await mcpCommand(workspace);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// This allows the CLI to be executed directly, but also imported for tests.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runCli(process.argv);
}
