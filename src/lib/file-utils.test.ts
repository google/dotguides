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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { vol } from "memfs";
import type { fs } from "memfs";
import { pathExists } from "./file-utils.js";
import * as fsPromises from "fs/promises";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("pathExists", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("returns true when the path exists", async () => {
    vol.fromJSON({ "/workspace/file.txt": "" });
    await expect(pathExists("/workspace/file.txt")).resolves.toBe(true);
  });

  it("returns false when the path is missing", async () => {
    vol.fromJSON({});
    await expect(pathExists("/workspace/missing.txt")).resolves.toBe(false);
  });

  it("rethrows errors other than ENOENT", async () => {
    const error = new Error("boom") as NodeJS.ErrnoException;
    error.code = "EACCES";
    const statSpy = vi.spyOn(fsPromises, "stat").mockRejectedValueOnce(error);
    await expect(pathExists("/restricted"))
      .rejects.toThrowError(error);
    expect(statSpy).toHaveBeenCalledWith("/restricted");
    statSpy.mockRestore();
  });
});
