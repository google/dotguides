import { describe, it, expect, vi, beforeEach } from "vitest";
import { sh } from "../shell-utils.js";

vi.mock('../shell-utils.js', () => ({
  sh: vi.fn(),
}));
import { SwiftLanguageAdapter } from "./swift.js";
import { join } from "path";

describe("Swift Language Adapter", () => {
  let swift: SwiftLanguageAdapter;

  beforeEach(() => {
    vi.mocked(sh).mockClear();
    const derivedDataPath = join(process.cwd(), 'testing', 'swift', 'DerivedData');
    swift = new SwiftLanguageAdapter(derivedDataPath);
  });

  it("should detect a Swift package", async () => {
    const testDir = join(process.cwd(), "testing", "swift", "dummy-package");
    const context = await swift.discover(testDir);

    expect(context.detected).toBe(true);
    expect(context.name).toBe("swift");
    expect(context.workspacePackage).toBeDefined();
    expect(context.workspacePackage!.name).toBe("dummy-package");
  });

  it("should detect an Xcode project", async () => {
    vi.mocked(sh).mockRejectedValue(new Error('Command failed'));
    const testDir = join(process.cwd(), "testing", "swift", "Dummy1");
    const context = await swift.discover(testDir);

    expect(context.detected).toBe(true);
    expect(context.name).toBe("swift");
    expect(context.packages).toHaveLength(4);

    const samplePackage = context.packages.find(p => p.name === 'sample-swift-package');
    expect(samplePackage).toBeDefined();

    const algorithmsPackage = context.packages.find(p => p.name === 'swift-algorithms');
    expect(algorithmsPackage).toBeDefined();
  });

  it("should correctly identify a local package", async () => {
    vi.mocked(sh).mockRejectedValue(new Error('Command failed'));
    const testDir = join(process.cwd(), "testing", "swift", "Dummy1");
    const context = await swift.discover(testDir);

    const localPackage = context.packages.find(p => p.name === 'dummy-package');
    expect(localPackage).toBeDefined();
    const expectedPath = join(process.cwd(), 'testing', 'swift', 'dummy-package');
    expect(localPackage?.dir).toBe(expectedPath);
  });
});
