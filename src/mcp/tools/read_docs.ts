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

import z from "zod";
import { tool } from "../tool.js";
import { section } from "../../lib/render-utils.js";

export const read_docs = tool(
  {
    name: "read_docs",
    title: "Read Documentation",
    description:
      "Use this tool to load one or more docs files discovered via Dotguides.",
    inputSchema: z.object({
      uris: z
        .array(z.string())
        .describe(
          "list of docs uris to load, usually in the form `docs:{packageName}:{path/to/doc}`"
        ),
    }),
  },
  async ({ uris }, { workspace }) => {
    const docs = uris.map((uri) => {
      const [_, pkg, name] = uri.split(":");
      return { pkg, name, doc: workspace.doc(pkg, name) };
    });

    const renderedContent = await Promise.all(
      docs
        .filter((d) => !!d.doc)
        .map(async ({ doc, pkg, name }) => {
          if (!doc) {
            return null;
          }
          const content = await doc.render({
            workspaceDir: "",
            packageVersion: "",
            dependencyVersion: "",
            language: {
              detected: false,
              name: "",
              packages: [],
            },
          });
          const text = content
            .map((c) => ("text" in c ? c.text : ""))
            .join("\n");
          return {
            type: "text" as const,
            text: section({ name: "doc", attrs: { package: pkg, name } }, text),
          };
        })
    );

    return {
      content: renderedContent.filter((c) => !!c),
    };
  }
);
