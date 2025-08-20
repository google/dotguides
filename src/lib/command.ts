import { ContentFile } from "./content-file.js";
import type { CommandConfig } from "./types.js";

export class Command extends ContentFile {
  constructor(
    source: { path: string } | { url: string },
    public config: CommandConfig
  ) {
    super(source);
  }
}
