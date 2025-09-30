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

import { DartLanguageAdapter } from "./languages/dart.js";
import { GoLanguageAdapter } from "./languages/go.js";
import { JavascriptLanguageAdapter } from "./languages/javascript.js";
import { PythonLanguageAdapter } from "./languages/python.js";
import type { LanguageAdapter, LanguageContext } from "./language-adapter.js";

export const allLanguages: LanguageAdapter[] = [
  new JavascriptLanguageAdapter(),
  new DartLanguageAdapter(),
  new GoLanguageAdapter(),
  new PythonLanguageAdapter(),
];

export async function detectLanguage(
  directory: string,
): Promise<[LanguageAdapter, LanguageContext] | [null, null]> {
  for (const adapter of allLanguages) {
    const context = await adapter.discover(directory);
    if (context.detected) {
      return [adapter, context];
    }
  }
  return [null, null];
}
