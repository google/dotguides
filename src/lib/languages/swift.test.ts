import { describe, it, expect, vi } from "vitest";
import { mkdir, writeFile } from "fs/promises";
import { SwiftLanguageAdapter } from "./swift.js";
import { join } from "path";

describe("Swift Language Adapter", () => {
  it("should detect a Swift package", async () => {
    const testDir = join(process.cwd(), "testing", "swift", "dummy-package");
    const swift = new SwiftLanguageAdapter();
    const context = await swift.discover(testDir);

    expect(context.detected).toBe(true);
    expect(context.name).toBe("swift");
    expect(context.workspacePackage).toBeDefined();
    expect(context.workspacePackage!.name).toBe("dummy-package");
    expect(context.packages).toHaveLength(1);
  });

  it("should detect an Xcode project", async () => {
    const testDir = join(process.cwd(), "testing", "swift", "Dummy1");
    const swift = new SwiftLanguageAdapter();
    const context = await swift.discover(testDir);

    expect(context.detected).toBe(true);
    expect(context.name).toBe("swift");
    expect(context.packages).toHaveLength(3);
  });

  it("should correctly identify a local package", async () => {
    const testDir = join(process.cwd(), "testing", "swift", "Dummy1");
    const swift = new SwiftLanguageAdapter();
    const context = await swift.discover(testDir);

    const localPackage = context.packages.find(p => p.name === 'dummy-package');
    expect(localPackage).toBeDefined();
    const expectedPath = join(process.cwd(), 'testing', 'swift', 'dummy-package');
    expect(localPackage?.dir).toBe(expectedPath);
  });
});
