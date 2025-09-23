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

import { Workspace } from "../../lib/workspace.js";

export async function discoverCommand() {
  const workspace = await Workspace.load([process.cwd()]);

  if (Object.keys(workspace.packageMap).length === 0) {
    console.log("No .guides packages found in this workspace.");
    return;
  }

  console.log("Discovered .guides packages:");

  for (const pkg of Object.values(workspace.packageMap)) {
    const guideCount = pkg.guides.length;
    const docCount = pkg.docs.length;
    const commandCount = pkg.commands.length;

    const parts: string[] = [];
    if (guideCount > 0) {
      parts.push(`${guideCount} guides`);
    }
    if (docCount > 0) {
      parts.push(`${docCount} docs`);
    }
    if (commandCount > 0) {
      parts.push(`commands: ${commandCount > 0 ? "" : " (none)"}`);
    }

    console.log(
      `- ${pkg.name}${parts.length > 0 ? `: ${parts.join(", ")}` : ""}`,
    );

    if (pkg.commands.length > 0) {
      for (const command of pkg.commands) {
        console.log(`    ${command.signature}`);
      }
    }
  }
}
