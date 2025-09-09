import { DartLanguageAdapter } from "./languages/dart.js";
import { GoLanguageAdapter } from "./languages/go.js";
import { JavascriptLanguageAdapter } from "./languages/javascript.js";
import type { LanguageAdapter, LanguageContext } from "./language-adapter.js";

export const allLanguages: LanguageAdapter[] = [
  new JavascriptLanguageAdapter(),
  new DartLanguageAdapter(),
  new GoLanguageAdapter(),
];

export async function detectLanguage(
  directory: string
): Promise<[LanguageAdapter, LanguageContext] | [null, null]> {
  for (const adapter of allLanguages) {
    const context = await adapter.discover(directory);
    if (context.detected) {
      return [adapter, context];
    }
  }
  return [null, null];
}
