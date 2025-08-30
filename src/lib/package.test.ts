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
      languages: [
        {
          packages: [
            {
              name: "test-package",
              packageVersion: "1.0.0",
              dependencyVersion: "1.0.0",
            },
          ],
        },
      ],
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
      languages: [
        {
          packages: [
            {
              name: "test-package",
              packageVersion: "1.0.0",
              dependencyVersion: "1.0.0",
            },
          ],
        },
      ],
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
      languages: [
        {
          packages: [
            {
              name: "test-package",
              packageVersion: "1.0.0",
              dependencyVersion: "1.0.0",
            },
          ],
        },
      ],
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

  describe("commands", () => {
    it("should discover commands from the filesystem", async () => {
      vol.fromJSON({
        "/test/package/.guides/commands/command1.md": "command1",
        "/test/package/.guides/commands/command2.prompt": "command2",
      });

      const workspace = {
        directories: ["/test"],
        languages: [
          {
            packages: [
              {
                name: "test-package",
                packageVersion: "1.0.0",
                dependencyVersion: "1.0.0",
              },
            ],
          },
        ],
        dotprompt: { parse: () => ({ frontmatter: {} }) },
      } as unknown as Workspace;
      const pkg = await Package.load(
        workspace,
        "test-package",
        "/test/package/.guides"
      );

      expect(pkg.commands.length).toBe(2);
      const commandNames = pkg.commands.map((c) => c.config.name).sort();
      expect(commandNames).toEqual(["command1", "command2"]);
    });

    it("should load commands from config.json", async () => {
      const guidesJsonContent = {
        commands: [
          {
            name: "command1",
            path: "c1.md",
          },
          {
            name: "command2",
            url: "http://example.com/c2.md",
          },
        ],
      };
      vol.fromJSON({
        "/test/package/.guides/config.json": JSON.stringify(guidesJsonContent),
        "/test/package/.guides/c1.md": "command1",
      });

      const workspace = {
        directories: ["/test"],
        languages: [
          {
            packages: [
              {
                name: "test-package",
                packageVersion: "1.0.0",
                dependencyVersion: "1.0.0",
              },
            ],
          },
        ],
      } as unknown as Workspace;
      const pkg = await Package.load(
        workspace,
        "test-package",
        "/test/package/.guides"
      );

      expect(pkg.commands.length).toBe(2);
      const commandNames = pkg.commands.map((c) => c.config.name).sort();
      expect(commandNames).toEqual(["command1", "command2"]);
    });

    it("should prioritize configured commands over discovered ones", async () => {
      const guidesJsonContent = {
        commands: [
          {
            name: "command1",
            path: "configured.md",
            description: "configured",
          },
        ],
      };
      vol.fromJSON({
        "/test/package/.guides/config.json": JSON.stringify(guidesJsonContent),
        "/test/package/.guides/commands/command1.md": "discovered",
        "/test/package/.guides/configured.md": "configured",
      });

      const workspace = {
        directories: ["/test"],
        languages: [
          {
            packages: [
              {
                name: "test-package",
                packageVersion: "1.0.0",
                dependencyVersion: "1.0.0",
              },
            ],
          },
        ],
      } as unknown as Workspace;
      const pkg = await Package.load(
        workspace,
        "test-package",
        "/test/package/.guides"
      );

      expect(pkg.commands.length).toBe(1);
      const command = pkg.commands[0];
      expect(command).toBeDefined();
      if (command) {
        expect(command.config.description).toBe("configured");
      }
    });
  });
});
