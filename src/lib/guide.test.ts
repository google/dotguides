import { describe, it, expect } from "vitest";
import { Guide } from "./guide.js";

describe("Guide", () => {
  it("should be instantiable", () => {
    const guide = new Guide({ path: "test.md" }, { description: "Test Guide" });
    expect(guide).toBeInstanceOf(Guide);
  });
});
