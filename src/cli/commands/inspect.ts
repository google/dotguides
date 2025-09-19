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

import { Package } from "../../lib/package.js";
import { Workspace } from "../../lib/workspace.js";
import { countTokens, formatTokenCount } from "../../lib/render-utils.js";

export async function inspectCommand(packageName: string) {
  const workspace = await Workspace.load([process.cwd()]);
  const pkg = workspace.packageMap[packageName];

  if (!pkg) {
    console.error(`Package "${packageName}" not found.`);
    process.exit(1);
  }

  console.log(`Inspecting package: ${pkg.name}`);

  console.log("\nFeatures:");

  if (pkg.guides.length > 0) {
    console.log("  Guides:");
    for (const guide of pkg.guides) {
      const content = await guide.render();
      const tokens = countTokens(content);
      console.log(
        `    - ${guide.config.name} (~${formatTokenCount(tokens)} tokens)`
      );
    }
  }

  if (pkg.docs.length > 0) {
    let totalTokens = 0;
    for (const doc of pkg.docs) {
      const content = await doc.content;
      totalTokens += countTokens(content);
    }
    console.log(
      `  Docs: ${pkg.docs.length} discovered (~${formatTokenCount(
        totalTokens
      )} tokens)`
    );
    const topLevelDocs = pkg.docs.filter(
      (doc) => !doc.config.name.includes("/")
    );
    for (const doc of topLevelDocs) {
      let line = `    - ${doc.config.name}`;
      if (doc.description) {
        line += `: ${doc.description}`;
      }
      console.log(line);
    }
    const subDirDocs: Record<string, number> = {};
    for (const doc of pkg.docs) {
      if (doc.config.name.includes("/")) {
        const dir = doc.config.name.split("/")[0];
        if (dir) {
          subDirDocs[dir] = (subDirDocs[dir] || 0) + 1;
        }
      }
    }
    for (const [dir, count] of Object.entries(subDirDocs)) {
      console.log(`    - ${dir}/ (${count} docs)`);
    }
  }

  if (pkg.commands.length > 0) {
    console.log("  Commands:");
    for (const command of pkg.commands) {
      console.log(`    - ${command.signature}`);
    }
  }
}
