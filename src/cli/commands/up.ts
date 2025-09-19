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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Workspace } from "../../lib/workspace.js";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";

export async function upCommand(): Promise<void> {
  const workspace = await Workspace.load([process.cwd()]);

  const instructions = await workspace.systemInstructions({ listDocs: true });
  await writeFile(join(process.cwd(), "DOTGUIDES.md"), instructions);

  const geminiDir = join(process.cwd(), ".gemini");
  await mkdir(geminiDir, { recursive: true });
  const settingsPath = join(geminiDir, "settings.json");

  let settings: any = {};
  try {
    settings = JSON.parse(await readFile(settingsPath, "utf-8"));
  } catch (e) {
    // file doesn't exist or is invalid json, start with empty settings
  }

  settings.context ??= {};
  if (!settings.context.fileName) {
    settings.context.fileName = ["GEMINI.md", "DOTGUIDES.md"];
  } else {
    const filenames = Array.isArray(settings.context.fileName)
      ? settings.context.fileName
      : [settings.context.fileName];
    if (!filenames.includes("DOTGUIDES.md")) {
      filenames.push("DOTGUIDES.md");
    }
    settings.context.fileName = filenames;
  }

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

  settings.mcpServers ??= {};
  for (const serverName in mcpServers) {
    if (!settings.mcpServers[serverName]) {
      settings.mcpServers[serverName] = mcpServers[serverName];
    }
  }

  await writeFile(settingsPath, JSON.stringify(settings, null, 2));

  console.log(
    "Dotguides bootstrapped for Gemini CLI. You can now run `gemini`.",
  );
}
