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

import { readFile, stat, writeFile, mkdir } from "fs/promises";
import { join, resolve, dirname } from "path";

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

/**
 * Reads and parses a JSON file, returning a fallback value if the file does not exist.
 * @param filePath The path to the JSON file.
 * @param fallback The fallback value to return if the file does not exist.
 * @returns The parsed JSON object, or the fallback value.
 */
export async function readJsonFile<T = unknown>(
  filePath: string,
): Promise<T | null>;
export async function readJsonFile<T>(
  filePath: string,
  fallback: T,
): Promise<T>;
export async function readJsonFile<T = unknown>(
  filePath: string,
  fallback: T | null = null,
): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      return fallback;
    }
    throw e;
  }
}

/**
 * Writes a JSON object to a file, creating the directory if it does not exist.
 * @param filePath The path to the JSON file.
 * @param data The JSON object to write.
 */
export async function writeJsonFile(
  filePath: string,
  data: any,
): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
