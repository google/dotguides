import { describe, it, expect, vi, beforeEach } from "vitest";
import { Package } from "./package.js";
import { vol } from "memfs";
import type { fs } from "memfs";
import type { Workspace } from "./workspace.js";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("Package", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should load config.json", async () => {
    const guidesJsonContent = {
      guides: [
        {
          name: "setup",
          description: "Setup guide",
          path: "setup.md",
        },
      ],
    };
    vol.fromJSON({
      "/test/package/.guides/config.json": JSON.stringify(guidesJsonContent),
      "/test/package/.guides/setup.md": "This is a setup guide.",
    });

    const workspace = {
      directories: ["/test"],
      languages: [{ packages: ["test-package"] }],
    } as unknown as Workspace;
    const pkg = await Package.load(
      workspace,
      "test-package",
      "/test/package/.guides"
    );

    const setupGuide = pkg.guides.find((g) => g.config.name === "setup");
    expect(setupGuide).toBeDefined();
    expect(setupGuide?.config.description).toBe("Setup guide");
  });

  it("should load docs from nested directories", async () => {
    vol.fromJSON({
      "/test/package/.guides/docs/getting-started.md": "Getting started guide.",
      "/test/package/.guides/docs/api/authentication.md":
        "Authentication API docs.",
    });

    const workspace = {
      directories: ["/test"],
      languages: [{ packages: ["test-package"] }],
    } as unknown as Workspace;
    const pkg = await Package.load(
      workspace,
      "test-package",
      "/test/package/.guides"
    );

    expect(pkg.docs.length).toBe(2);
    const docNames = pkg.docs.map((d) => d.config.name).sort();
    expect(docNames).toEqual(["api/authentication", "getting-started"]);
  });

  it("should prioritize configured docs over discovered docs", async () => {
    const guidesJsonContent = {
      docs: [
        {
          name: "foo",
          path: "foo-configured.md",
        },
      ],
    };
    vol.fromJSON({
      "/test/package/.guides/config.json": JSON.stringify(guidesJsonContent),
      "/test/package/.guides/docs/foo.md": "This is the discovered foo doc.",
      "/test/package/.guides/foo-configured.md":
        "This is the configured foo doc.",
    });

    const workspace = {
      directories: ["/test"],
      languages: [{ packages: ["test-package"] }],
    } as unknown as Workspace;
    const pkg = await Package.load(
      workspace,
      "test-package",
      "/test/package/.guides"
    );

    expect(pkg.docs.length).toBe(1);
    const fooDoc = pkg.docs[0];
    expect(fooDoc).toBeDefined();
    if (fooDoc) {
      expect(fooDoc.name).toBe("foo");
      expect(fooDoc.source).toMatchObject({
        path: "/test/package/.guides/foo-configured.md",
      });
    }
  });
});
