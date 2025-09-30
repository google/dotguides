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

import {
  PythonLanguageAdapter,
  findPythonEnvironment,
  parsePyproject,
  parseSetupCfg,
} from "./python.js";
import type { Workspace } from "../workspace.js";
import { cachedFetch } from "../cached-fetch.js";

vi.mock("../cached-fetch.js", () => ({
  cachedFetch: vi.fn(),
}));

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

vi.mock("fs", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs;
});

describe("PythonLanguageAdapter", () => {
  beforeEach(() => {
    vol.reset();
    delete process.env.UV_PROJECT_ENVIRONMENT;
    delete process.env.VIRTUAL_ENV;
    delete process.env.DOTGUIDES_CONTRIB;
    vi.mocked(cachedFetch).mockReset();
  });

  it("returns not detected when no Python signals are present", async () => {
    vol.fromJSON({});
    const adapter = new PythonLanguageAdapter();
    const context = await adapter.discover("/workspace");
    expect(context.detected).toBe(false);
    expect(context.packages).toHaveLength(0);
  });

  it("detects pyproject metadata and packages", async () => {
    vol.fromJSON({
      "/workspace/pyproject.toml": `# sample\n[project]\nname = "demo"\nversion = "1.2.3"\n`,
      "/workspace/.guides/usage.md": "",
      "/workspace/.venv/pyvenv.cfg": "version = 3.11.2\n",
      "/workspace/.venv/lib/python3.11/site-packages/pkg/.guides/usage.md": "",
      "/workspace/.venv/lib/python3.11/site-packages/pkg.dist-info/METADATA": `Name: pkg\nVersion: 0.4.0\n`,
      "/workspace/.venv/lib/python3.11/site-packages/pkg.dist-info/RECORD": `pkg/.guides/usage.md,,\n`,
    });

    const adapter = new PythonLanguageAdapter();
    const context = await adapter.discover("/workspace");

    expect(context.detected).toBe(true);
    expect(context.name).toBe("python");
    expect(context.runtime).toBe("python");
    expect(context.runtimeVersion).toBe("3.11.2");
    expect(context.workspacePackage).toEqual({
      name: "demo",
      packageVersion: "1.2.3",
      dependencyVersion: "1.2.3",
      dir: "/workspace",
      guides: true,
    });
    expect(context.packages).toEqual([
      {
        name: "pkg",
        dir: "/workspace/.venv/lib/python3.11/site-packages/pkg",
        packageVersion: "0.4.0",
        dependencyVersion: "0.4.0",
        guides: true,
        development: false,
        optional: false,
      },
    ]);
  });

  it("loads packages via cached discovery", async () => {
    vol.fromJSON({
      "/workspace/pyproject.toml": `[project]\nname = "demo"\n`,
      "/workspace/.venv/pyvenv.cfg": "version = 3.11.2\n",
      "/workspace/.venv/lib/python3.11/site-packages/pkg/.guides/usage.md":
        "guide",
      "/workspace/.venv/lib/python3.11/site-packages/pkg/.guides/style.md":
        "style",
      "/workspace/.venv/lib/python3.11/site-packages/pkg.dist-info/METADATA": `Name: pkg\nVersion: 0.4.0\n`,
      "/workspace/.venv/lib/python3.11/site-packages/pkg.dist-info/RECORD": `pkg/.guides/usage.md,,\npkg/.guides/style.md,,\n`,
    });

    const adapter = new PythonLanguageAdapter();
    const context = await adapter.discover("/workspace");

    const workspace = {
      languages: [context],
      packageMap: {},
    } as unknown as Workspace;

    const pkg = await adapter.loadPackage(workspace, "/workspace", "pkg");
    expect(pkg.name).toBe("pkg");
    expect(pkg.guides.length).toBeGreaterThan(0);
  });

  it("discovers contrib packages from DOTGUIDES_CONTRIB", async () => {
    vol.fromJSON({
      "/contrib/python/pkg/.guides/usage.md": "",
    });
    process.env.DOTGUIDES_CONTRIB = "/contrib";

    const adapter = new PythonLanguageAdapter();
    const results = await adapter.discoverContrib(["pkg"]);
    expect(results).toEqual(["file:/contrib/python/pkg"]);
  });

  it("falls back to PyPI when contrib path is not set", async () => {
    const mockResponse = { ok: true } as Response;
    vi.mocked(cachedFetch).mockResolvedValue(mockResponse);
    const adapter = new PythonLanguageAdapter();
    const results = await adapter.discoverContrib(["pkg"]);
    expect(results).toEqual(["pkg"]);
    expect(cachedFetch).toHaveBeenCalledWith(
      "https://pypi.org/pypi/dotguides-contrib-pkg/json",
      { method: "HEAD" },
    );
  });

  it("uses .python-version when no environment version is available", async () => {
    vol.fromJSON({
      "/workspace/pyproject.toml": `[project]\nname = "demo"\n`,
      "/workspace/.python-version": "3.12.1\n",
    });

    const adapter = new PythonLanguageAdapter();
    const context = await adapter.discover("/workspace");

    expect(context.runtimeVersion).toBe("3.12.1");
  });

  describe("findPythonEnvironment", () => {
    it("returns the nearest virtualenv", async () => {
      vol.fromJSON({
        "/workspace/pyproject.toml": "",
        "/workspace/.env/pyvenv.cfg": "home = /workspace\n",
        "/workspace/project/.venv/pyvenv.cfg": "home = /workspace/project\n",
      });

      const env = await findPythonEnvironment("/workspace/project");

      expect(env).toEqual("/workspace/project/.venv");
    });

    it("walks up to parent directories when no workspace root exists", async () => {
      vol.fromJSON({
        "/workspace/project/.venv/pyvenv.cfg": "home = /workspace/project\n",
        "/workspace/project/src/module/__init__.py": "",
      });

      const env = await findPythonEnvironment("/workspace/project/src/module");

      expect(env).toEqual("/workspace/project/.venv");
    });
  });

  describe("parsePyproject", () => {
    it("extracts name and version from [project] section", () => {
      const content = `
  [project]
  name = "demo-app"
  version = "1.2.3"
  `;
      const metadata = parsePyproject(content);
      expect(metadata.name).toBe("demo-app");
      expect(metadata.version).toBe("1.2.3");
    });

    it("falls back to tool.poetry metadata and records manager hints", () => {
      const content = `
  [project]
  name = ""

  [tool.poetry]
  name = "poetry-app"
  version = "0.4.0"
  `;
      const metadata = parsePyproject(content);
      expect(metadata.name).toBe("poetry-app");
      expect(metadata.version).toBe("0.4.0");
      expect(metadata.managerHints?.has("tool.poetry")).toBe(true);
    });
  });

  describe("parseSetupCfg", () => {
    it("reads metadata name and version", () => {
      const content = `
[metadata]
name = my-package
version = 0.1.0
`;
      const metadata = parseSetupCfg(content);
      expect(metadata.name).toBe("my-package");
      expect(metadata.version).toBe("0.1.0");
    });
  });
});
