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

import { readFile, stat } from "fs/promises";
import { join, resolve } from "path";

/**
 * Checks if any of the specified files exists relative to the specified root.
 * @param root The root directory to check in, or null to check for absolute paths.
 * @param files The files to check for.
 * @returns The path of the first file found, or false if none are found.
 */
export async function existsAny(
  root: string | null,
  ...files: string[]
): Promise<string | false> {
  for (const file of files) {
    const path = root ? resolve(root, file) : file;
    try {
      await stat(path);
      return path;
    } catch (e) {
      // file doesn't exist
    }
  }
  return false;
}

/**
 * Reads the first file detected from the provided list.
 * @param root The root directory to read from.
 * @param files The files to try reading.
 * @returns An object with the file path and content, or null if no file could be read.
 */
export async function readAny(
  root: string,
  ...files: string[]
): Promise<{ file: string; content: string } | null> {
  for (const file of files) {
    const path = join(root, file);
    try {
      const content = await readFile(path, "utf-8");
      return { file: path, content };
    } catch (e) {
      // file doesn't exist, try next
    }
  }
  return null;
}
