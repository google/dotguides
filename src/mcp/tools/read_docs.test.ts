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
import { read_docs } from "./read_docs.js";
import { Workspace } from "../../lib/workspace.js";
import { Doc } from "../../lib/doc.js";
import { Guide } from "../../lib/guide.js";

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
      guide: vi.fn(),
      package: vi.fn(),
    } as unknown as Workspace;

    const result = await read_docs.fn(
      { uris: ["docs:test-pkg:test-doc"] },
      { workspace: mockWorkspace },
    );

    expect(mockWorkspace.doc).toHaveBeenCalledWith("test-pkg", "test-doc");
    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.text).toContain("Hello, world!");
  });

  it("should read guides from the workspace", async () => {
    const mockGuide = {
      config: { name: "test-guide" },
      render: vi
        .fn()
        .mockResolvedValue([{ type: "text", text: "Hello, guide!" }]),
    } as unknown as Guide;

    const mockWorkspace = {
      doc: vi.fn(),
      guide: vi.fn().mockReturnValue(mockGuide),
      package: vi.fn(),
    } as unknown as Workspace;

    const result = await read_docs.fn(
      { uris: ["guides:test-pkg:test-guide"] },
      { workspace: mockWorkspace },
    );

    expect(mockWorkspace.guide).toHaveBeenCalledWith("test-pkg", "test-guide");
    expect(result.content).toHaveLength(1);
    expect(result.content[0]!.text).toContain("Hello, guide!");

  });

  it("should include links to child docs", async () => {
    const mockDoc = {
      name: "parent-doc",
      config: { name: "parent-doc" },
      render: vi
        .fn()
        .mockResolvedValue([{ type: "text", text: "Parent content" }]),
    } as unknown as Doc;

    const mockChildDoc = {
      name: "parent-doc/child",
      title: "Child Doc",
      description: "A child document",
      config: { name: "parent-doc/child" },
    } as unknown as Doc;

    const mockPackage = {
      docs: [mockDoc, mockChildDoc],
    };

    const mockWorkspace = {
      doc: vi.fn().mockReturnValue(mockDoc),
      package: vi.fn().mockReturnValue(mockPackage),
    } as unknown as Workspace;

    const result = await read_docs.fn(
      { uris: ["docs:test-pkg:parent-doc"] },
      { workspace: mockWorkspace },
    );

    expect(result.content).toHaveLength(1);
    const text = result.content[0]!.text;
    expect(text).toContain("Parent content");
    expect(text).toContain("<related-docs>");
    expect(text).toContain(
      "- [Child Doc](docs:test-pkg:parent-doc/child): A child document",
    );
  });
});
