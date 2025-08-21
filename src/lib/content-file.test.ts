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
    const content = contentFile.content;

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
    const content = contentFile.content;

    expect(global.fetch).toHaveBeenCalledWith(url);
    expect(content).toBe(fileContent);
  });

  describe("frontmatter parsing", () => {
    const tests = [
      {
        desc: "should parse frontmatter",
        input: "---\ntitle: Test\n---\nHello, world!",
        expect: { title: "Test" },
      },
      {
        desc: "should parse frontmatter with leading whitespace",
        input: "\n---\ntitle: Test\n---\nHello, world!",
        expect: { title: "Test" },
      },
      {
        desc: "should return empty object if no frontmatter",
        input: "Hello, world!",
        expect: {},
      },
      {
        desc: "should not be greedy with frontmatter",
        input: "---\ndescription: Test\n---\nHello, world!\n---\nfoo: bar\n---",
        expect: { description: "Test" },
      },
    ];

    for (const { desc, input, expect: expected } of tests) {
      it(desc, async () => {
        const filePath = "/test.md";
        vol.fromJSON({ [filePath]: input });
        const contentFile = await ContentFile.load({ path: filePath });
        expect(contentFile.frontmatter).toEqual(expected);
      });
    }
  });

  describe("rendering", () => {
    const tests = [
      {
        desc: "should strip frontmatter when rendering markdown",
        input: "---\ntitle: Test\n---\nHello, world!",
        path: "/test.md",
        expect: "Hello, world!",
      },
      {
        desc: "should identify prompt from file extension",
        input: "prompt content",
        path: "/test.prompt",
        expect: "prompt content",
      },
      {
        desc: "should identify prompt from url extension",
        input: "prompt content",
        url: "http://example.com/test.prompt",
        expect: "prompt content",
      },
      {
        desc: "should identify prompt from content type",
        input: "prompt content",
        url: "http://example.com/test",
        contentType: "text/x-dotprompt",
        expect: "prompt content",
      },
    ];

    for (const {
      desc,
      input,
      expect: expected,
      path,
      url,
      contentType,
    } of tests) {
      it(desc, async () => {
        let source: { path: string } | { url: string };
        if (path) {
          source = { path };
          vol.fromJSON({ [path]: input });
        } else {
          source = { url: url! };
          global.fetch = vi.fn().mockResolvedValue({
            headers: new Map(
              contentType ? [["content-type", contentType]] : []
            ),
            text: () => Promise.resolve(input),
          });
        }
        const contentFile = await ContentFile.load(source);
        const rendered = contentFile.render({});
        expect(rendered).toBe(expected);
      });
    }
  });
});
