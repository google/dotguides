import { ContentFile } from "./content-file.js";
import type { GuideConfig } from "./types.js";

export class Guide extends ContentFile {
  constructor(
    source: { path: string } | { url: string },
    public config: GuideConfig
  ) {
    super(source);
  }
}
