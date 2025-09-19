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
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from "vitest";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import { formatTokenCount, countTokens } from "./render-utils.js";

describe("formatTokenCount", () => {
  const tests = [
    {
      desc: "should return the exact number for tokens less than 1000",
      input: 999,
      expect: "999",
    },
    {
      desc: "should format tokens in K for thousands",
      input: 1500,
      expect: "1.5K",
    },
    {
      desc: "should format tokens in K for tens of thousands",
      input: 15500,
      expect: "15.5K",
    },
    {
      desc: "should format tokens in M for millions",
      input: 1500000,
      expect: "1.5M",
    },
  ];

  for (const { desc, input, expect: expected } of tests) {
    it(desc, () => {
      expect(formatTokenCount(input)).toBe(expected);
    });
  }
});

describe("countTokens", () => {
  const tests: { desc: string; input: ContentBlock[]; expect: number }[] = [
    {
      desc: "should count tokens from text blocks",
      input: [{ type: "text", text: "This is a test string." }],
      expect: 6,
    },
    {
      desc: "should count tokens from image blocks",
      input: [{ type: "image", data: "...", mimeType: "image/png" }],
      expect: 270,
    },
    {
      desc: "should count tokens from a mix of text and image blocks",
      input: [
        { type: "text", text: "This is a test string." },
        { type: "image", data: "...", mimeType: "image/png" },
        { type: "text", text: "Another test string." },
      ],
      expect: 281,
    },
    {
      desc: "should ignore audio blocks",
      input: [{ type: "audio", data: "...", mimeType: "audio/mp3" }],
      expect: 0,
    },
    {
      desc: "should handle an empty array",
      input: [],
      expect: 0,
    },
    {
      desc: "should handle blocks with no text",
      input: [{ type: "text", text: "" }],
      expect: 0,
    },
  ];

  for (const { desc, input, expect: expected } of tests) {
    it(desc, () => {
      expect(countTokens(input)).toBe(expected);
    });
  }
});
