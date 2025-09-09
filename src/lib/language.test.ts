import { describe, it, expect } from "vitest";
import { detectLanguage } from "./language.js";
import { join } from "path";

describe("detectLanguage", () => {
  it("should detect javascript", async () => {
    const [adapter, context] = await detectLanguage(
      join(process.cwd(), "testing/dart/loudify")
    );
    expect(adapter?.constructor.name).toBe("DartLanguageAdapter");
    expect(context?.name).toBe("dart");
  });
});
