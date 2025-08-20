import { describe, it, expect, vi, beforeEach } from "vitest";
import { ContentFile } from "./content-file.js";
import { vol } from "memfs";
import type { fs } from "memfs";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

describe("ContentFile", () => {
  beforeEach(() => {
    vol.reset();
  });

  it("should read content from a file path", async () => {
    const filePath = "/test.md";
    const fileContent = "Hello, world!";
    vol.fromJSON({ [filePath]: fileContent });

    const contentFile = await ContentFile.load({ path: filePath });
    const content = contentFile.getContent();

    expect(content).toBe(fileContent);
  });

  it("should fetch content from a URL", async () => {
    const url = "http://example.com/test.md";
    const fileContent = "Hello, from URL!";
    global.fetch = vi.fn().mockResolvedValue({
      headers: new Map(),
      text: () => Promise.resolve(fileContent),
    });

    const contentFile = await ContentFile.load({ url });
    const content = contentFile.getContent();

    expect(global.fetch).toHaveBeenCalledWith(url);
    expect(content).toBe(fileContent);
  });

  it("should parse frontmatter", async () => {
    const filePath = "/test.md";
    const fileContent = `---
title: Test
---
Hello, world!`;
    vol.fromJSON({ [filePath]: fileContent });

    const contentFile = await ContentFile.load({ path: filePath });
    const frontmatter = contentFile.getFrontmatter();

    expect(frontmatter).toEqual({ title: "Test" });
  });

  it("should return empty object if no frontmatter", async () => {
    const filePath = "/test.md";
    const fileContent = "Hello, world!";
    vol.fromJSON({ [filePath]: fileContent });

    const contentFile = await ContentFile.load({ path: filePath });
    const frontmatter = contentFile.getFrontmatter();

    expect(frontmatter).toEqual({});
  });

  it("should strip frontmatter when rendering markdown", async () => {
    const filePath = "/test.md";
    const fileContent = `---
title: Test
---
Hello, world!`;
    vol.fromJSON({ [filePath]: fileContent });

    const contentFile = await ContentFile.load({ path: filePath });
    const rendered = contentFile.render({});

    expect(rendered).toBe("Hello, world!");
  });

  it("should identify prompt from file extension", async () => {
    const filePath = "/test.prompt";
    const fileContent = "prompt content";
    vol.fromJSON({ [filePath]: fileContent });

    const contentFile = await ContentFile.load({ path: filePath });
    const rendered = contentFile.render({});

    // Placeholder for dotprompt rendering
    expect(rendered).toBe(fileContent);
  });

  it("should identify prompt from url extension", async () => {
    const url = "http://example.com/test.prompt";
    const fileContent = "prompt content";
    global.fetch = vi.fn().mockResolvedValue({
      headers: new Map(),
      text: () => Promise.resolve(fileContent),
    });

    const contentFile = await ContentFile.load({ url });
    const rendered = contentFile.render({});

    // Placeholder for dotprompt rendering
    expect(rendered).toBe(fileContent);
  });

  it("should identify prompt from content type", async () => {
    const url = "http://example.com/test";
    const fileContent = "prompt content";
    global.fetch = vi.fn().mockResolvedValue({
      headers: new Map([["content-type", "text/x-dotprompt"]]),
      text: () => Promise.resolve(fileContent),
    });

    const contentFile = await ContentFile.load({ url });
    const rendered = contentFile.render({});

    // Placeholder for dotprompt rendering
    expect(rendered).toBe(fileContent);
  });
});
