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
import { read_docs } from "./read_docs.js";
import { Workspace } from "../../lib/workspace.js";
import { Doc } from "../../lib/doc.js";

describe("read_docs tool", () => {
  it("should read docs from the workspace", async () => {
    const mockDoc = {
      config: { name: "test-doc" },
      render: vi
        .fn()
        .mockResolvedValue([{ type: "text", text: "Hello, world!" }]),
    } as unknown as Doc;

    const mockWorkspace = {
      doc: vi.fn().mockReturnValue(mockDoc),
    } as unknown as Workspace;

    const result = await read_docs.fn(
      { uris: ["docs:test-pkg:test-doc"] },
      { workspace: mockWorkspace }
    );

    expect(mockWorkspace.doc).toHaveBeenCalledWith("test-pkg", "test-doc");
    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.text).toContain("Hello, world!");
  });
});
