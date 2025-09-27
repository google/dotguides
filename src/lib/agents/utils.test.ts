import { describe, it, expect } from "vitest";
import { appendOrUpdate } from "./utils.js";

describe("appendOrUpdate", () => {
  it("should append if no tags are found", () => {
    const content = "Hello world";
    const instructions = "This is an instruction.";
    const result = appendOrUpdate(content, instructions);
    expect(result).toBe(
      "Hello world\n\n<dotguides>\nThis is an instruction.\n</dotguides>",
    );
  });

  it("should update if tags are found", () => {
    const content =
      "Hello world\n<dotguides>\nold instructions\n</dotguides>\nmore content";
    const instructions = "new instructions";
    const result = appendOrUpdate(content, instructions);
    expect(result).toBe(
      "Hello world\n<dotguides>\nnew instructions\n</dotguides>\nmore content",
    );
  });

  it("should throw an error if start tag is found but no end tag", () => {
    const content = "Hello world\n<dotguides>\nold instructions";
    const instructions = "new instructions";
    expect(() => appendOrUpdate(content, instructions)).toThrow(
      "Found <dotguides> but no closing </dotguides>",
    );
  });

  it("should handle multiple lines of instructions", () => {
    const content = "Hello world";
    const instructions = "line 1\nline 2";
    const result = appendOrUpdate(content, instructions);
    expect(result).toBe(
      "Hello world\n\n<dotguides>\nline 1\nline 2\n</dotguides>",
    );
  });

  it("should handle empty content", () => {
    const content = "";
    const instructions = "This is an instruction.";
    const result = appendOrUpdate(content, instructions);
    expect(result).toBe(
      "\n\n<dotguides>\nThis is an instruction.\n</dotguides>",
    );
  });

  it("should handle empty instructions", () => {
    const content = "Hello world\n<dotguides>\nold instructions\n</dotguides>";
    const instructions = "";
    const result = appendOrUpdate(content, instructions);
    expect(result).toBe("Hello world\n<dotguides>\n\n</dotguides>");
  });
});
