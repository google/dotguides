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

import { describe, it, expect, vi } from "vitest";
import { commandToPrompt } from "./command.js";
import type { Package } from "../../lib/package.js";
import type { Command } from "../../lib/command.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";

describe("commandToPrompt", () => {
  it("should create a valid prompt from a command", async () => {
    const pkg = {
      name: "test-pkg",
      renderContext: () => ({
        workspaceDir: "/test",
        packageVersion: "1.0.0",
        dependencyVersion: "1.0.0",
        language: { name: "javascript" },
      }),
    } as unknown as Package;

    const command = {
      config: {
        name: "test-command",
        description: "A test command",
      },
      arguments: [{ name: "arg1", required: true, description: "" }],
      render: vi.fn().mockResolvedValue([{ type: "text", text: "hello" }]),
    } as unknown as Command;

    const prompt = commandToPrompt(pkg, command);

    expect(prompt.name).toBe("test-pkg:test-command");
    expect(prompt.description).toBe("A test command");
    expect(prompt.arguments).toEqual([
      { name: "arg1", required: true, description: "" },
    ]);

    const result = await (prompt as any).execute({ arg1: "value1" }, undefined);
    expect(command.render).toHaveBeenCalledWith(
      {
        workspaceDir: "/test",
        packageVersion: "1.0.0",
        dependencyVersion: "1.0.0",
        language: { name: "javascript" },
      },
      { arg1: "value1" }
    );
    expect(result).toEqual({
      messages: [
        {
          role: "user",
          content: { type: "text", text: "hello" },
        },
      ],
    });
  });
});
