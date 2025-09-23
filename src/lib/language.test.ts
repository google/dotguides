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

import { describe, it, expect } from "vitest";
import { detectLanguage } from "./language.js";
import { join } from "path";

describe("detectLanguage", () => {
  it("should detect javascript", async () => {
    const [adapter, context] = await detectLanguage(
      join(process.cwd(), "testing/dart/loudify"),
    );
    expect(adapter?.constructor.name).toBe("DartLanguageAdapter");
    expect(context?.name).toBe("dart");
  });
});
