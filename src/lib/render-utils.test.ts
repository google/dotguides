import { describe, it, expect } from "vitest";
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
  it("should count tokens based on content length", () => {
    const content = "This is a test string.";
    const expected = Math.round(content.length / 4);
    expect(countTokens(content)).toBe(expected);
  });
});
