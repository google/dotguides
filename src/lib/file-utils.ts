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
