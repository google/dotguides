#!/usr/bin/env node
/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { parseArgs } from "util";
import { fileURLToPath } from "url";
import { resolve } from "path";
import { createCommand } from "./commands/create.js";
import { discoverCommand } from "./commands/discover.js";
import { inspectCommand } from "./commands/inspect.js";
import { rulesCommand } from "./commands/rules.js";
import { mcpCommand } from "./commands/mcp.js";
import { upCommand } from "./commands/up.js";
import { checkCommand } from "./commands/check.js";
import { hookCommand } from "./commands/hook.js";
import { HELP_TEXT } from "./templates.js";

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
      auto: {
        type: "boolean",
      },
      ask: {
        type: "boolean",
      },
      agent: {
        type: "string",
      },
    },
    allowPositionals: true,
    strict: false,
  });

  const command = positionals[0];

  if (values.help || !command) {
    console.log(HELP_TEXT);
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
    case "create":
      await createCommand();
      break;
    case "up":
      await upCommand({ auto: !!values.auto, ask: !!values.ask });
      break;
    case "hook":
      await hookCommand({ agent: values.agent as string });
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
