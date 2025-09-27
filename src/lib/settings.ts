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

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import os from "os";

const SETTINGS_FILE = ".guides.config.json";

export interface Settings {
  packages?: {
    disabled?: string[];
    discovered?: string[];
  };
  mcpServers?: Record<string, any>;
}

async function readSettingsFile(path: string): Promise<Settings> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch (e: any) {
    // Not an error if file doesn't exist
    if (e.code === "ENOENT") {
      return {};
    }
    throw e;
  }
}

export async function readWorkspaceSettings(): Promise<Settings> {
  const workspaceSettingsPath = join(process.cwd(), SETTINGS_FILE);
  return readSettingsFile(workspaceSettingsPath);
}

export async function readSettings(): Promise<Settings> {
  const userSettingsPath = join(os.homedir(), SETTINGS_FILE);

  const userSettings = await readSettingsFile(userSettingsPath);
  const workspaceSettings = await readWorkspaceSettings();

  const disabled = [
    ...(userSettings.packages?.disabled || []),
    ...(workspaceSettings.packages?.disabled || []),
  ];

  const discovered = [
    ...(userSettings.packages?.discovered || []),
    ...(workspaceSettings.packages?.discovered || []),
  ];

  const settings: Settings = {
    packages: {
      disabled: [...new Set(disabled)],
      discovered: [...new Set(discovered)],
    },
  };

  return settings;
}

export async function writeWorkspaceSettings(
  settings: Settings,
): Promise<void> {
  const path = join(process.cwd(), SETTINGS_FILE);
  await writeFile(path, JSON.stringify(settings, null, 2));
}
