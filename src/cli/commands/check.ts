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
import { green, red, yellow } from "../../lib/colors.js";

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

  console.log(`Checking package: ${pkg.name}`);

  console.log("\nFeatures:");

  if (pkg.guides.length > 0) {
    console.log("  Guides:");
    for (const guide of pkg.guides) {
      const content = await guide.render();
      const tokens = countTokens(content);
      console.log(
        `    - ${guide.config.name} (~${formatTokenCount(tokens)} tokens)`,
      );
      if (guide.config.name === "usage" || guide.config.name === "style") {
        if (tokens > 1000) {
          errors.push(
            `${guide.config.name} guide is too large: ${formatTokenCount(
              tokens,
            )} tokens (max 1000)`,
          );
        } else if (tokens >= 700) {
          warnings.push(
            `${guide.config.name} guide is getting large: ${formatTokenCount(
              tokens,
            )} tokens (warn @ 700)`,
          );
        }
      }
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
        totalTokens,
      )} tokens)`,
    );
    const topLevelDocs = pkg.docs.filter(
      (doc) => !doc.config.name.includes("/"),
    );
    if (topLevelDocs.length > 10) {
      errors.push(`Too many top-level docs: ${topLevelDocs.length} (max 10)`);
    } else if (topLevelDocs.length >= 8) {
      warnings.push(
        `Consider nesting some top-level docs: ${topLevelDocs.length} (warn @ 8)`,
      );
    }
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

  console.log("\nLinter Results:");
  if (warnings.length === 0 && errors.length === 0) {
    console.log(green("  ✅ All checks passed!"));
  } else {
    for (const warning of warnings) {
      console.log(yellow(`  ⚠️  ${warning}`));
    }
    for (const error of errors) {
      console.log(red(`  🚫 ${error}`));
    }
    console.log();
    if (errors.length > 0) {
      console.log(
        red(
          `Found ${errors.length} error(s) and ${warnings.length} warning(s).`,
        ),
      );
      process.exit(1);
    } else {
      console.log(yellow(`Found ${warnings.length} warning(s).`));
    }
  }
}
