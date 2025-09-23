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

import { describe, it, expect, vi } from "vitest";
import { Command } from "./command.js";
import type { ContentFile } from "./content-file.js";
import type { Package } from "./package.js";

vi.mock("./content-file.js");

describe("Command", () => {
  describe("signature", () => {
    const tests = [
      {
        desc: "no arguments",
        name: "test",
        args: undefined,
        expect: "test",
      },
      {
        desc: "one required argument",
        name: "test",
        args: [{ name: "arg1", required: true, description: "" }],
        expect: "test <arg1>",
      },
      {
        desc: "one optional argument",
        name: "test",
        args: [{ name: "arg1", required: false, description: "" }],
        expect: "test [arg1]",
      },
      {
        desc: "mixed arguments",
        name: "test",
        args: [
          { name: "arg1", required: true, description: "" },
          { name: "arg2", required: false, description: "" },
        ],
        expect: "test <arg1> [arg2]",
      },
    ];

    for (const test of tests) {
      it(test.desc, async () => {
        const { loadContentFile } = await import("./content-file.js");
        const mockContentFile: Partial<ContentFile> = {
          frontmatter: { arguments: test.args },
        };
        vi.mocked(loadContentFile).mockResolvedValue(
          mockContentFile as ContentFile,
        );

        const config: any = {
          name: test.name,
          path: "test.prompt",
        };
        if (test.args) {
          config.arguments = test.args;
        }

        const command = await Command.load(
          {
            guidesDir: "/test",
            dotprompt: { parse: () => ({ frontmatter: {} }) },
          } as unknown as Package,
          { path: "test.prompt" },
          config,
        );
        expect(command.signature).toBe(test.expect);
      });
    }
  });
});
