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
import { setup } from "./setup.js";
import { Workspace } from "../../lib/workspace.js";
import { Guide } from "../../lib/guide.js";
import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

describe("setup prompt", () => {
  it("should return setup instructions for a package", async () => {
    const mockRenderContext = { mock: "context" };
    const mockGuide = {
      config: { name: "setup" },
      render: vi
        .fn()
        .mockResolvedValue([{ type: "text", text: "Setup instructions" }]),
    } as unknown as Guide;

    const mockPackage = {
      guides: [mockGuide],
      renderContext: vi.fn().mockReturnValue(mockRenderContext),
    };

    const mockWorkspace = {
      packageMap: {
        "test-pkg": mockPackage,
      },
    } as unknown as Workspace;

    const result = await setup.fn(
      { package: "test-pkg" },
      { workspace: mockWorkspace }
    );

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.content.text).toBe("Setup instructions");
    expect(mockGuide.render).toHaveBeenCalledWith(mockRenderContext);
  });

  it("should throw an error if package is not provided", async () => {
    const mockWorkspace = {
      packageMap: {},
    } as unknown as Workspace;

    await expect(
      setup.fn({ package: "" }, { workspace: mockWorkspace })
    ).rejects.toThrow(InvalidRequestError);
  });

  it("should throw an error if package is not found", async () => {
    const mockWorkspace = {
      packageMap: {},
    } as unknown as Workspace;

    await expect(
      setup.fn({ package: "not-found" }, { workspace: mockWorkspace })
    ).rejects.toThrow(InvalidRequestError);
  });

  it("should throw an error if setup guide is not found", async () => {
    const mockWorkspace = {
      packageMap: {
        "test-pkg": {
          guides: [],
        },
      },
    } as unknown as Workspace;

    await expect(
      setup.fn({ package: "test-pkg" }, { workspace: mockWorkspace })
    ).rejects.toThrow(InvalidRequestError);
  });
});
