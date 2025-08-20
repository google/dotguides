import { describe, it, expect } from "vitest";
import { Doc } from "./doc.js";

describe("Doc", () => {
  it("should be instantiable", () => {
    const doc = new Doc(
      { path: "test.md" },
      { name: "Test Doc", description: "A test document." }
    );
    expect(doc).toBeInstanceOf(Doc);
  });
});
