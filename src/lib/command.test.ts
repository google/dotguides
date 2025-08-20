import { describe, it, expect } from "vitest";
import { Command } from "./command.js";

describe("Command", () => {
  it("should be instantiable", () => {
    const command = new Command(
      { path: "test.md" },
      { name: "Test Command", description: "A test command.", arguments: [] }
    );
    expect(command).toBeInstanceOf(Command);
  });
});
