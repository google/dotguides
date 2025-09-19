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
import { Workspace } from "./workspace.js";
import { vol } from "memfs";
import type { fs } from "memfs";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

vi.mock("fs", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs;
});

describe("Workspace", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should initialize workspace by detecting language and discovering packages", async () => {
    const directories = ["/test/workspace"];
    vol.fromJSON({
      "/test/workspace/package.json": JSON.stringify({
        dependencies: { "package-a": "1.0.0", "package-b": "1.0.0" },
      }),
      "/test/workspace/pnpm-lock.yaml": "",
      "/test/workspace/node_modules/package-a/.guides/config.json":
        JSON.stringify({
          guides: [{ name: "setup", description: "a", path: "setup.md" }],
        }),
      "/test/workspace/node_modules/package-a/.guides/setup.md": "a",
      "/test/workspace/node_modules/@dotguides-contrib/package-b/config.json":
        JSON.stringify({
          guides: [{ name: "setup", description: "b", path: "setup.md" }],
        }),
      "/test/workspace/node_modules/@dotguides-contrib/package-b/setup.md": "b",
    });

    const workspace = await Workspace.load(directories);

    expect(Object.keys(workspace.packageMap).length).toBe(2);
    expect(workspace.packageMap["package-a"]).toBeDefined();
    expect(workspace.packageMap["package-b"]).toBeDefined();

    const contexts = workspace.languages;
    expect(contexts).toHaveLength(1);
    const context = contexts[0];
    if (context) {
      expect(context.detected).toBe(true);
      expect(context.packageManager).toBe("pnpm");
      expect(context.packages.map((p) => p.name).sort()).toEqual([
        "package-a",
        "package-b",
      ]);
    } else {
      expect(context).toBeDefined();
    }
  });

  it("should correctly load multiple URL-based docs", async () => {
    const directories = ["/test/workspace"];
    const config = {
      docs: [
        {
          url: "https://example.com/doc1.md",
          name: "doc1",
          description: "This is the first doc.",
        },
        {
          url: "https://example.com/doc2.md",
          name: "doc2",
          description: "This is the second doc.",
        },
      ],
    };
    vol.fromJSON({
      "/test/workspace/package.json": JSON.stringify({
        dependencies: { "package-a": "1.0.0" },
      }),
      "/test/workspace/pnpm-lock.yaml": "",
      "/test/workspace/node_modules/package-a/.guides/config.json":
        JSON.stringify(config),
    });

    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockImplementation((url: any) => {
      if (url.toString() === "https://example.com/doc1.md") {
        return Promise.resolve(
          new Response("content for doc1", {
            headers: { "Content-Type": "text/markdown" },
          })
        );
      }
      if (url.toString() === "https://example.com/doc2.md") {
        return Promise.resolve(
          new Response("content for doc2", {
            headers: { "Content-Type": "text/markdown" },
          })
        );
      }
      return Promise.resolve(new Response("not found", { status: 404 }));
    });

    const workspace = await Workspace.load(directories);
    const pkg = workspace.package("package-a");
    const doc1 = pkg?.doc("doc1");
    const doc2 = pkg?.doc("doc2");

    expect(doc1).toBeDefined();
    expect(doc2).toBeDefined();

    const content1 = await doc1?.content;
    const content2 = await doc2?.content;

    if (content1 && content1[0]?.type === "text") {
      expect(content1[0].text).toBe("content for doc1");
    } else {
      expect(content1).toBeDefined();
      expect(content1?.[0]?.type).toBe("text");
    }

    if (content2 && content2[0]?.type === "text") {
      expect(content2[0].text).toBe("content for doc2");
    } else {
      expect(content2).toBeDefined();
      expect(content2?.[0]?.type).toBe("text");
    }

    fetchSpy.mockRestore();
  });
});
