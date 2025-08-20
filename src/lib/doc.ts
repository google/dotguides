import { ContentFile } from "./content-file.js";
import type { DocConfig } from "./types.js";

export class Doc extends ContentFile {
  constructor(
    source: { path: string } | { url: string },
    public config: DocConfig
  ) {
    super(source);
  }
}
