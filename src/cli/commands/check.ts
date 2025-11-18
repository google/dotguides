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

import { join } from "path";
import { existsAny } from "../../lib/file-utils.js";
import { Package } from "../../lib/package.js";
import { Workspace } from "../../lib/workspace.js";
import { countTokens, formatTokenCount } from "../../lib/render-utils.js";
import { allLanguages } from "../../lib/language.js";
import type { LanguageAdapter, LanguageContext } from "../../lib/language-adapter.js";
import { bold, cyan, dim, green, red, yellow } from "../../lib/colors.js";
import { calculateTokenBudget } from "../../lib/token-budget.js";

export async function checkCommand() {
  let pkg: Package | undefined;
  const loadPath = process.cwd();

  let adapter: LanguageAdapter | undefined;
  let context: LanguageContext | undefined;
  for (const lang of allLanguages) {
    const maybeContext = await lang.discover(loadPath);
    if (maybeContext.detected) {
      adapter = lang;
      context = maybeContext;
      break;
    }
  }
  if (adapter && context) {
    const workspace = new Workspace([loadPath]);
    workspace.languages.push(context);
    if (context.workspacePackage) {
      const guidesDir = join(context.workspacePackage.dir, ".guides");
      if (await existsAny(null, guidesDir)) {
        pkg = await Package.load(
          workspace,
          context.workspacePackage.name,
          guidesDir,
        );
        workspace.packageMap[pkg.name] = pkg;
      }
    }
  } else {
    console.error(
      `Could not determine language for directory ${loadPath}. No dotguides-compatible language detected.`,
    );
    process.exit(1);
  }

  if (!pkg) {
    console.error(`Could not load package from current directory.`);
    process.exit(1);
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  console.log(bold(`\nChecking package: ${cyan(pkg.name)}`));

  console.log(bold("\nFeatures:"));

  if (pkg.guides.length > 0) {
    console.log("  Guides:");
    for (const guide of pkg.guides) {
      const content = await guide.render();
      const tokens = countTokens(content);
      console.log(
        `    - ${cyan(guide.config.name)} ${dim(`(~${formatTokenCount(tokens)} tokens)`)}`,
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
      `  Docs: ${pkg.docs.length} discovered ${dim(`(~${formatTokenCount(totalTokens)} tokens)`)}`,
    );
    const topLevelDocs = pkg.docs.filter(
      (doc) => !doc.config.name.includes("/"),
    );
    for (const doc of topLevelDocs) {
      let line = `    - ${cyan(doc.config.name)}`;
      if (doc.description) {
        line += `: ${dim(doc.description)}`;
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
      console.log(`    - ${cyan(dir + "/")} ${dim(`(${count} docs)`)}`);
    }
  }

  if (pkg.commands.length > 0) {
    console.log("  Commands:");
    for (const command of pkg.commands) {
      console.log(`    - ${cyan(command.signature)}`);
    }
  }

  console.log(bold("\nToken Budget:"));
  const budget = await calculateTokenBudget(pkg);

  const pad = (label: string) => label.padEnd(10);

  console.log(`  ${pad("Usage:")} ${formatTokenCount(budget.usage)}`);
  console.log(`  ${pad("Style:")} ${formatTokenCount(budget.style)}`);
  console.log(`  ${pad("Docs:")} ${formatTokenCount(budget.docs)}`);
  console.log(`  ${pad("Clerical:")} ${formatTokenCount(budget.clerical)}`);
  console.log(dim("  " + "-".repeat(20)));

  const totalStr = `${pad("Total:")} ${formatTokenCount(budget.total)}`;
  if (budget.total < 1500) {
    console.log(green(`  ${totalStr}`));
    console.log(green(bold("\n  ✅ Budget check passed!")));
  } else if (budget.total <= 2000) {
    console.log(yellow(`  ${totalStr}`));
    console.log(yellow(bold("\n  ⚠️  Budget warning: Total tokens between 1500 and 2000.")));
  } else {
    console.log(red(`  ${totalStr}`));
    console.log(red(bold("\n  🚫 Budget exceeded: Total tokens > 2000.")));
    process.exit(1);
  }
}
