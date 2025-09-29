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

import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { prompt } from "../prompt.js";
import { readSettings } from "../../lib/settings.js";

export const setup = prompt(
  {
    name: "setup",
    description: "Get setup instructions for a package.",
    arguments: [{ name: "package", required: false }],
  },
  async (args, { workspace }) => {
    if (args.package) {
      const pkg = workspace.packageMap[args.package];
      if (!pkg) {
        throw new InvalidRequestError(`Package '${args.package}' not found.`);
      }
      const setupGuide = pkg.guides.find((g) => g.config.name === "setup");
      if (!setupGuide) {
        throw new InvalidRequestError(
          `Setup guide not found for package '${args.package}'.`,
        );
      }
      const content = await setupGuide.render(pkg.renderContext());
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: content.map((c) => ("text" in c ? c.text : "")).join("\n"),
            },
          },
        ],
      };
    }

    const settings = await readSettings();
    const packagesWithSetup = workspace.packagesWithSetup;
    const setupComplete = settings.packages?.setupComplete || [];

    const pendingSetup = packagesWithSetup.filter(
      (p) => !setupComplete.includes(p.name),
    );

    if (pendingSetup.length === 0) {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "All packages with setup guides have been configured.",
            },
          },
        ],
      };
    }

    const packageList = pendingSetup
      .map((p) => `- ${p.name} ([view setup](guides:${p.name}:setup))`)
      .join("\n");

    const promptText = `The following packages have setup guides that have not been run yet:\n${packageList}\n\nWhich one would you like to run? Use the
ead_docs tool to load the setup guide based on the user's response.`;

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptText,
          },
        },
      ],
    };
  },
);
