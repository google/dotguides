import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { DotguidesConfig } from "../../lib/types.js";

export async function initCommand() {
  const guidesDir = join(process.cwd(), ".guides");
  const guidesJsonPath = join(guidesDir, "guides.json");

  const guidesJson: DotguidesConfig = {
    guides: {
      setup: {
        description: "Instructions for setting up the project.",
      },
      style: {
        description: "Guidelines for code style and conventions.",
      },
      usage: {
        description: "Examples and instructions for using the project.",
      },
    },
  };

  try {
    await mkdir(guidesDir, { recursive: true });
    await writeFile(guidesJsonPath, JSON.stringify(guidesJson, null, 2));
    console.log(`Initialized .guides package in ${guidesDir}`);
  } catch (error) {
    console.error("Failed to initialize .guides package:", error);
    process.exit(1);
  }
}
