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
import { readFile, readdir, stat } from "fs/promises";
import { basename, dirname, isAbsolute, join, resolve, relative } from "path";
import { parse as parseToml } from "smol-toml";
import { parse as parseIni } from "ini";

import { Package } from "../package.js";
import type {
  LanguageAdapter,
  LanguageContext,
  PackageInfo,
} from "../language-adapter.js";
import { existsAny, pathExists, readAny } from "../file-utils.js";
import { cachedFetch } from "../cached-fetch.js";
import type { Workspace } from "../workspace.js";

const DOTGUIDES_DIR = ".guides";
const DOTGUIDES_PATH_FRAGMENT = `/${DOTGUIDES_DIR}/`;
const VENV_MARKER = "pyvenv.cfg"; // PEP 405 marker for virtual environments.

const DETECTION_FILES = [
  "pyproject.toml",
  "setup.cfg",
  "setup.py",
  "requirements.txt",
  "uv.lock",
];

type GuideOrigin = "site-packages";

interface PythonGuideLocation {
  distribution: string;
  version: string | null;
  packageDir: string;
  packageName: string;
  guidesDir: string;
  origin: GuideOrigin;
}

interface WorkspaceMetadata {
  name?: string;
  version?: string;
  managerHints?: Set<string>;
}

async function isVenvRoot(dir: string): Promise<boolean> {
  return pathExists(join(dir, VENV_MARKER));
}

async function nearestWorkspaceRoot(start: string): Promise<string | null> {
  let current = resolve(start);
  while (true) {
    if (
      (await pathExists(join(current, "pyproject.toml"))) ||
      (await pathExists(join(current, "uv.lock")))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export async function findPythonEnvironment(
  startDir: string,
): Promise<string | null> {
  const start = resolve(startDir);
  const workspaceRoot = await nearestWorkspaceRoot(start);
  const searchRoot = workspaceRoot ?? start;

  const uvEnv = process.env.UV_PROJECT_ENVIRONMENT;
  if (uvEnv) {
    // uv lets users point to a project environment explicitly; resolve it
    // relative to the workspace root (pyproject/uv.lock) when given a
    // relative path, so we mirror uv's own lookup rules.
    const target = isAbsolute(uvEnv) ? uvEnv : resolve(searchRoot, uvEnv);
    if (await isVenvRoot(target)) {
      return resolve(target);
    }
  }

  const venvNames = [".venv", ".env", "venv", "env"];
  // Walk upward from the starting directory toward the workspace root
  // (pyproject / uv.lock), checking each level for well-known virtualenv
  // folder names. Stop once we reach the workspace root so we avoid
  // unrelated directories higher in the tree.
  const withinWorkspace = (dir: string): boolean => {
    if (!workspaceRoot) {
      return true;
    }
    const rel = relative(workspaceRoot, dir);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  };

  let current = start;
  while (true) {
    if (withinWorkspace(current)) {
      for (const name of venvNames) {
        const candidate = resolve(current, name);
        if (await isVenvRoot(candidate)) {
          return candidate;
        }
      }
    }

    if (workspaceRoot && current === workspaceRoot) {
      break;
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }

    if (workspaceRoot && !withinWorkspace(parent)) {
      break;
    }

    current = parent;
  }

  return null;
}

/**
 * Locates all candidate `site-packages` directories under a virtualenv root.
 * Handles both Windows (`Lib/site-packages`) and POSIX layouts
 * (`lib/pythonX.Y/site-packages`).
 */
export async function findSitePackages(envRoot: string): Promise<string[]> {
  const roots: string[] = [];

  const windowsSitePackages = join(envRoot, "Lib", "site-packages");
  if (await pathExists(windowsSitePackages)) {
    roots.push(windowsSitePackages);
  }

  const libDir = join(envRoot, "lib");
  let libEntries: string[] = [];
  try {
    libEntries = await readdir(libDir);
  } catch (error) {
    if (!isErrnoException(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const entry of libEntries) {
    if (!entry.startsWith("python")) continue;
    const sitePackages = join(libDir, entry, "site-packages");
    if (await pathExists(sitePackages)) {
      roots.push(sitePackages);
    }
  }

  return roots;
}

interface DistributionMetadata {
  name: string;
  version: string | null;
}

/**
 * Reads the wheel METADATA file (PEP 376) from the given `.dist-info` folder.
 * METADATA is an RFC 822-style document containing key/value pairs such as:
 *   Name: requests
 *   Version: 2.32.3
 */
async function parseDistributionMetadata(
  distInfoDir: string,
): Promise<DistributionMetadata | null> {
  const metadataPath = join(distInfoDir, "METADATA");

  try {
    const content = await readFile(metadataPath, "utf-8");
    let name: string | null = null;
    let version: string | null = null;
    for (const line of content.split(/\r?\n/)) {
      if (line.startsWith("Name:")) {
        name = line.slice("Name:".length).trim();
      } else if (line.startsWith("Version:")) {
        const value = line.slice("Version:".length).trim();
        version = value || null;
      }
      if (name && version) break;
    }
    if (name === null || version === null) {
      return null;
    }
    return { name, version };
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Returns the relative paths declared in a wheel's RECORD manifest (PEP 427).
 * RECORD entries are simple CSV rows – path, hash, size. We only need the path,
 * so this trims the first column instead of using a full CSV parser.
 */
async function readRecordPaths(distInfoDir: string): Promise<string[]> {
  const recordPath = join(distInfoDir, "RECORD");
  try {
    const content = await readFile(recordPath, "utf-8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        if (line.startsWith('"')) {
          let index = 1;
          let value = "";
          while (index < line.length) {
            const char = line[index];
            if (char === '"') {
              if (line[index + 1] === '"') {
                value += '"';
                index += 2;
                continue;
              }
              index++;
              break;
            }
            value += char;
            index++;
          }
          return value;
        }
        const comma = line.indexOf(",");
        return comma === -1 ? line : line.slice(0, comma);
      });
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Coerces a RECORD path into a guide location. Wheels can install packages
 * under 'src/', namespace folders, etc. - not just at root - so we stop at
 * the path segment before '.guides' to recover the directory regardless of layout.
 */
function toGuideLocation(
  sitePackages: string,
  distribution: DistributionMetadata,
  recordPath: string,
): PythonGuideLocation | null {
  if (
    !recordPath.includes(DOTGUIDES_PATH_FRAGMENT) ||
    recordPath.includes("../")
  ) {
    return null;
  }

  const parts = recordPath.split("/");
  const guidesIndex = parts.indexOf(DOTGUIDES_DIR);
  if (guidesIndex <= 0) return null;

  const packageParts = parts.slice(0, guidesIndex);
  const packageName =
    packageParts[packageParts.length - 1] || distribution.name;
  if (!packageName) return null;

  const packageDir = join(sitePackages, ...packageParts);
  const guidesDir = join(packageDir, DOTGUIDES_DIR);

  return {
    distribution: distribution.name,
    version: distribution.version,
    packageDir,
    packageName,
    guidesDir,
    origin: "site-packages",
  };
}

/**
 * Scans a `site-packages` directory for installed wheels that bundle
 * Dotguides content. It reads each distribution's METADATA and RECORD
 * manifests to surface packages whose installed files include a `.guides`
 * directory.
 */
export async function listGuidesInSitePackages(
  sitePackages: string,
): Promise<PythonGuideLocation[]> {
  let entries;
  try {
    entries = await readdir(sitePackages, { withFileTypes: true });
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const guides: PythonGuideLocation[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.endsWith(".dist-info")) {
      continue;
    }

    const distInfoDir = join(sitePackages, entry.name);
    // METADATA provides the canonical package name + installed version.
    const metadata = await parseDistributionMetadata(distInfoDir);
    if (metadata === null) {
      continue;
    }

    // RECORD lists every file the wheel installed; we look for `.guides` files.
    const recordPaths = await readRecordPaths(distInfoDir);
    for (const recordPath of recordPaths) {
      const location = toGuideLocation(sitePackages, metadata, recordPath);
      if (location) {
        guides.push(location);
      }
    }
  }

  return guides;
}

/**
 * Normalizes Python distribution names to the canonical form used by PyPI.
 * PEP 503 mandates case-folding and collapsing of runs of `_`, `.` and `-`
 * to a single hyphen so `My_Package` and `my-package` map to the same entry.
 */
export function normalizePythonPackageName(name: string): string {
  return name.replace(/[_.]+/g, "-").toLowerCase();
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

export function parsePyproject(content: string): WorkspaceMetadata {
  const metadata: WorkspaceMetadata = { managerHints: new Set() };

  try {
    const doc = parseToml(content) as Record<string, unknown>;
    const project = doc.project as Record<string, unknown> | undefined;
    if (project) {
      if (typeof project.name === "string") {
        metadata.name = project.name;
      }
      if (typeof project.version === "string") {
        metadata.version = project.version;
      }
    }

    const tool = doc.tool as Record<string, unknown> | undefined;
    if (tool) {
      if (tool.poetry) {
        metadata.managerHints?.add("tool.poetry");
        const poetry = tool.poetry as Record<string, unknown>;
        if (typeof poetry.name === "string" && !metadata.name) {
          metadata.name = poetry.name;
        }
        if (typeof poetry.version === "string" && !metadata.version) {
          metadata.version = poetry.version;
        }
      }
      if (tool.pdm) {
        metadata.managerHints?.add("tool.pdm");
      }
    }
  } catch (error) {
    console.warn("Dotguides: failed to parse pyproject.toml", error);
  }

  return metadata;
}

export function parseSetupCfg(content: string): WorkspaceMetadata {
  const metadata: WorkspaceMetadata = {};
  const parsed = parseIni(content) as Record<string, any>;
  const metaSection = parsed.metadata as Record<string, unknown> | undefined;
  if (metaSection) {
    if (typeof metaSection.name === "string") {
      metadata.name = metaSection.name;
    }
    if (typeof metaSection.version === "string") {
      metadata.version = metaSection.version;
    }
  }
  return metadata;
}

async function readWorkspaceMetadata(
  directory: string,
): Promise<WorkspaceMetadata> {
  const metadata: WorkspaceMetadata = { managerHints: new Set() };
  const pyproject = await readAny(directory, "pyproject.toml");

  if (pyproject) {
    const parsed = parsePyproject(pyproject.content);
    if (parsed.name) metadata.name = parsed.name;
    if (parsed.version) metadata.version = parsed.version;
    parsed.managerHints?.forEach((hint) => metadata.managerHints?.add(hint));
  }

  const setupCfg = await readAny(directory, "setup.cfg");
  if (setupCfg) {
    const parsed = parseSetupCfg(setupCfg.content);
    if (parsed.name && !metadata.name) metadata.name = parsed.name;
    if (parsed.version && !metadata.version) metadata.version = parsed.version;
  }

  return metadata;
}

async function detectPackageManager(
  directory: string,
  metadata: WorkspaceMetadata,
): Promise<string | undefined> {
  if (await existsAny(directory, "uv.lock")) {
    return "uv";
  }
  if (
    metadata.managerHints?.has("tool.poetry") ||
    metadata.managerHints?.has("poetry")
  ) {
    return "poetry";
  }
  if (await existsAny(directory, "requirements.txt")) {
    return "pip";
  }
  if (await existsAny(directory, "setup.py")) {
    return "setuptools";
  }
  return undefined;
}

/**
 * Attempts to determine the Python runtime version for a given environment.
 * Prefers the version recorded in `pyvenv.cfg` and falls back to `.python-version`
 * if present in the workspace directory.
 */
async function detectRuntimeVersion(
  envPath: string | null,
  workspaceDir: string,
): Promise<string | undefined> {
  let pyvenvVersion: string | undefined;
  if (envPath) {
    const cfg = await readFile(join(envPath, "pyvenv.cfg"), "utf-8");
    const parsed = parseIni(cfg) as Record<string, unknown>;
    const version = parsed.version;
    if (typeof version === "string" && version.trim()) {
      pyvenvVersion = version.trim();
    }
  }

  if (pyvenvVersion) return pyvenvVersion;

  const pythonVersion = await readAny(workspaceDir, ".python-version");
  if (pythonVersion) {
    const version = pythonVersion.content.trim();
    if (version) {
      return version;
    }
  }

  return undefined;
}

function packageInfoFromGuide(location: PythonGuideLocation): PackageInfo {
  return {
    name: location.distribution,
    dir: location.packageDir,
    packageVersion: location.version ?? "unknown",
    dependencyVersion: location.version ?? "unknown",
    guides: true,
    development: false,
    optional: false,
  };
}

export class PythonLanguageAdapter implements LanguageAdapter {
  private packagesByDistribution: Record<string, PythonGuideLocation> = {};

  async discover(directory: string): Promise<LanguageContext> {
    const detectPython = await existsAny(directory, ...DETECTION_FILES);
    if (!detectPython) {
      return {
        detected: false,
        name: "python",
        packages: [],
      };
    }

    const metadata = await readWorkspaceMetadata(directory);

    const env = await findPythonEnvironment(directory);
    if (!env) {
      console.warn(
        `No virtual environment found under '${directory}' (expected .venv/.env). Python package guides will be unavailable until an environment exists.`,
      );
    }

    const runtimeVersion = await detectRuntimeVersion(env, directory);
    const packageManager = await detectPackageManager(directory, metadata);

    this.packagesByDistribution = {};

    const sitePackages = env ? await findSitePackages(env) : [];
    for (const dir of sitePackages) {
      const discoveredGuides = await listGuidesInSitePackages(dir);
      for (const guide of discoveredGuides) {
        this.registerGuide(guide);
      }
    }

    const context: LanguageContext = {
      detected: true,
      name: "python",
      runtime: "python",
      packages: Object.values(this.packagesByDistribution).map(
        packageInfoFromGuide,
      ),
      workspacePackage: {
        name: metadata.name ?? basename(directory),
        packageVersion: metadata.version ?? "0.0.0",
        dependencyVersion: metadata.version ?? "0.0.0",
        dir: directory,
        guides: !!(await existsAny(directory, ".guides")),
      },
    };

    if (runtimeVersion) {
      context.runtimeVersion = runtimeVersion;
    }

    if (packageManager) {
      context.packageManager = packageManager;
    }

    return context;
  }

  async loadPackage(
    workspace: Workspace,
    directory: string,
    name: string,
  ): Promise<Package> {
    const normalized = normalizePythonPackageName(name);
    const cached = this.packagesByDistribution[normalized];
    if (cached) {
      return await Package.load(
        workspace,
        cached.distribution,
        cached.guidesDir,
      );
    }

    const env = await findPythonEnvironment(directory);
    if (env) {
      const sitePackages = await findSitePackages(env);
      for (const sitePackageDir of sitePackages) {
        const guides = await listGuidesInSitePackages(sitePackageDir);
        for (const guide of guides) {
          this.registerGuide(guide);
          if (
            normalizePythonPackageName(guide.distribution) === normalized ||
            normalizePythonPackageName(guide.packageName) === normalized
          ) {
            return await Package.load(
              workspace,
              guide.distribution,
              guide.guidesDir,
            );
          }
        }
      }
    }
    throw new Error(`Could not find guides for Python package '${name}'.`);
  }

  private registerGuide(guide: PythonGuideLocation): void {
    const key = normalizePythonPackageName(guide.distribution);
    if (!this.packagesByDistribution[key]) {
      this.packagesByDistribution[key] = guide;
    }
  }

  async discoverContrib(packages: string[]): Promise<string[]> {
    const discovered: string[] = [];
    const contribPath = process.env.DOTGUIDES_CONTRIB;
    if (contribPath) {
      for (const pkg of packages) {
        const normalized = normalizePythonPackageName(pkg);
        const dir = join(contribPath, "python", normalized);
        try {
          const stats = await stat(dir);
          if (stats.isDirectory()) {
            discovered.push(`file:${dir}`);
          }
        } catch (e) {
          // ignore
        }
      }
      return discovered;
    }

    const checks = packages.map(async (pkg) => {
      const normalized = normalizePythonPackageName(pkg);
      const url = `https://pypi.org/pypi/dotguides-contrib-${normalized}/json`;
      try {
        const res = await cachedFetch(url, { method: "HEAD" });
        if (res.ok) {
          return pkg;
        }
      } catch (e) {
        // ignore network errors
      }
      return null;
    });

    return (await Promise.all(checks)).filter(
      (pkg): pkg is string => pkg !== null,
    );
  }
}
