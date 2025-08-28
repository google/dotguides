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
