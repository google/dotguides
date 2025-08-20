import { describe, it, expect, vi, beforeEach } from "vitest";
import { Package } from "./package.js";
import { vol } from "memfs";
import type { fs } from "memfs";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("Package", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should load guides.json", async () => {
    const guidesJsonContent = {
      guides: {
        setup: { description: "Setup guide" },
      },
    };
    vol.fromJSON({
      "/test/package/.guides/guides.json": JSON.stringify(guidesJsonContent),
      "/test/package/.guides/setup.md": "This is a setup guide.",
    });

    const pkg = await Package.load("test-package", "/test/package/.guides");

    const setupGuide = pkg.guides["setup"];
    expect(setupGuide).toBeDefined();
    expect(setupGuide?.config.description).toBe("Setup guide");
  });

  it("should load docs from nested directories", async () => {
    vol.fromJSON({
      "/test/package/.guides/docs/getting-started.md": "Getting started guide.",
      "/test/package/.guides/docs/api/authentication.md":
        "Authentication API docs.",
    });

    const pkg = await Package.load("test-package", "/test/package/.guides");

    expect(pkg.docs.length).toBe(2);
    const docNames = pkg.docs.map((d) => d.config.name).sort();
    expect(docNames).toEqual(["api/authentication", "getting-started"]);
  });
});
