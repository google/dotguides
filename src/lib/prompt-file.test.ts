import { describe, it, expect, vi } from "vitest";
import { Package } from "./package.js";
import { PromptFile } from "./prompt-file.js";
import { Doc } from "./doc.js";
import { Workspace } from "./workspace.js";
import type { LanguageContext } from "./language-adapter.js";

describe("PromptFile", () => {
  it("should embed a doc", async () => {
    const mockWorkspace = new Workspace(["/test/workspace"]);
    const langContext: LanguageContext = {
      detected: true,
      name: "javascript",
      packageManager: "pnpm",
      runtime: "node",
      packages: [
        {
          name: "test-pkg",
          packageVersion: "1.0.0",
          dependencyVersion: "1.0.0",
          dir: "/test/workspace/node_modules/test-pkg",
          guides: true,
        },
      ],
    };
    mockWorkspace.languages.push(langContext);

    const pkg = new Package(
      mockWorkspace,
      "test-pkg",
      "/test/workspace/node_modules/test-pkg/.guides"
    );
    pkg.packageVersion = "1.0.0";
    pkg.dependencyVersion = "1.0.0";

    const docRender = vi
      .fn()
      .mockResolvedValue([{ type: "text", text: "rendered doc" }]);
    const doc = {
      name: "test-doc",
      title: "Test Doc",
      render: docRender,
    } as unknown as Doc;

    pkg.docs.push(doc);

    const promptFile = new (PromptFile as any)(
      pkg,
      { path: "test.prompt" },
      `Hello {{ embedDoc "test-doc" }}`
    );

    const renderContext = pkg.renderContext();
    const rendered = await promptFile.render(renderContext);

    expect(docRender).toHaveBeenCalledWith(renderContext);
    expect(rendered[0].text).toContain(
      `<doc uri="docs:test-pkg:test-doc" title="Test Doc">`
    );
    expect(rendered[0].text).toContain("rendered doc");
  });

  it("should embed multiple docs", async () => {
    const mockWorkspace = new Workspace(["/test/workspace"]);
    const langContext: LanguageContext = {
      detected: true,
      name: "javascript",
      packageManager: "pnpm",
      runtime: "node",
      packages: [
        {
          name: "test-pkg",
          packageVersion: "1.0.0",
          dependencyVersion: "1.0.0",
          dir: "/test/workspace/node_modules/test-pkg",
          guides: true,
        },
      ],
    };
    mockWorkspace.languages.push(langContext);

    const pkg = new Package(
      mockWorkspace,
      "test-pkg",
      "/test/workspace/node_modules/test-pkg/.guides"
    );
    pkg.packageVersion = "1.0.0";
    pkg.dependencyVersion = "1.0.0";

    const doc1Render = vi
      .fn()
      .mockResolvedValue([{ type: "text", text: "rendered doc 1" }]);
    const doc1 = {
      name: "test-doc-1",
      title: "Test Doc 1",
      render: doc1Render,
    } as unknown as Doc;

    const doc2Render = vi
      .fn()
      .mockResolvedValue([{ type: "text", text: "rendered doc 2" }]);
    const doc2 = {
      name: "test-doc-2",
      title: "Test Doc 2",
      render: doc2Render,
    } as unknown as Doc;

    pkg.docs.push(doc1, doc2);

    const promptFile = new (PromptFile as any)(
      pkg,
      { path: "test.prompt" },
      `Hello {{ embedDoc "test-doc-1" }} and {{ embedDoc "test-doc-2" }}`
    );

    const renderContext = pkg.renderContext();
    const rendered = await promptFile.render(renderContext);

    expect(doc1Render).toHaveBeenCalledWith(renderContext);
    expect(doc2Render).toHaveBeenCalledWith(renderContext);

    const text = rendered[0].text || "";
    expect(text).toContain(
      `<doc uri="docs:test-pkg:test-doc-1" title="Test Doc 1">`
    );
    expect(text).toContain("rendered doc 1");
    expect(text).toContain(
      `<doc uri="docs:test-pkg:test-doc-2" title="Test Doc 2">`
    );
    expect(text).toContain("rendered doc 2");
  });
});
