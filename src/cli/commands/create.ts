import { writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import {
  CONFIG_JSON_CONTENT,
  USAGE_PROMPT_CONTENT,
  TOPIC_PROMPT_CONTENT,
} from "../templates.js";

export async function createCommand() {
  const guidesDir = join(process.cwd(), ".guides");
  const docsDir = join(guidesDir, "docs");

  try {
    try {
      await stat(guidesDir);
      console.error(".guides directory already exists.");
      process.exit(1);
    } catch (e) {
      // Directory does not exist, which is what we want.
    }

    await mkdir(docsDir, { recursive: true });

    await writeFile(join(guidesDir, "config.json"), CONFIG_JSON_CONTENT);
    await writeFile(join(guidesDir, "usage.prompt"), USAGE_PROMPT_CONTENT);
    await writeFile(join(docsDir, "topic.prompt"), TOPIC_PROMPT_CONTENT);

    console.log(`Created default .guides files in ${guidesDir}`);
  } catch (error) {
    console.error("Failed to create .guides files:", error);
    process.exit(1);
  }
}
