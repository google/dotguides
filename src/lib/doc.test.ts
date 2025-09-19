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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Doc } from "./doc.js";
import { vol } from "memfs";
import type { fs } from "memfs";
import type { Package } from "./package.js";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("Doc", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should be instantiable", async () => {
    const filePath = "/test.md";
    const fileContent = "doc content";
    vol.fromJSON({ [filePath]: fileContent });

    const mockPackage = { name: "test-pkg" } as Package;
    const doc = await Doc.load(mockPackage, {
      name: "Test Doc",
      description: "A test document.",
      path: filePath,
    });
    expect(doc).toBeInstanceOf(Doc);
    const content = await doc.content;
    expect(content[0]?.type).toBe("text");
    if (content[0]?.type === "text") {
      expect(content[0]?.text).toBe(fileContent);
    }
  });
});
