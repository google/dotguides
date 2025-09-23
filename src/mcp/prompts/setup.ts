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

export const setup = prompt(
  {
    name: "setup",
    description: "Get setup instructions for a package.",
    arguments: [{ name: "package", required: true }],
  },
  async (args, { workspace }) => {
    if (!args.package) {
      throw new InvalidRequestError("The 'package' argument is required.");
    }
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
  },
);
