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

import { vol } from "memfs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCommand } from "./create.js";
import {
  CONFIG_JSON_CONTENT,
  USAGE_PROMPT_CONTENT,
  TOPIC_PROMPT_CONTENT,
} from "../templates.js";

// Mock the file system
vi.mock("fs/promises", async () => {
  const memfs: { [key: string]: any } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("create command", () => {
  const exit = vi
    .spyOn(process, "exit")
    .mockImplementation(() => undefined as never);
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it("should create default .guides files", async () => {
    await createCommand();

    const config = await vol.promises.readFile(".guides/config.json", "utf-8");
    expect(config).toEqual(CONFIG_JSON_CONTENT);

    const usage = await vol.promises.readFile(".guides/usage.prompt", "utf-8");
    expect(usage).toEqual(USAGE_PROMPT_CONTENT);

    const topic = await vol.promises.readFile(
      ".guides/docs/topic.prompt",
      "utf-8"
    );
    expect(topic).toEqual(TOPIC_PROMPT_CONTENT);
  });

  it("should exit if .guides directory already exists", async () => {
    await vol.promises.mkdir(".guides", { recursive: true });
    await createCommand();
    expect(exit).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith(".guides directory already exists.");
  });
});
