import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadContentFile, type ContentFileSource } from "./content-file.js";
import { vol } from "memfs";
import type { fs } from "memfs";
import { cachedFetch } from "./cached-fetch.js";
import type { RenderContext } from "./types.js";

vi.mock("fs/promises", async () => {
  const memfs: { fs: typeof fs } = await vi.importActual("memfs");
  return memfs.fs.promises;
});

vi.mock("./cached-fetch.js");

const mockedCachedFetch = vi.mocked(cachedFetch);

const renderContext: RenderContext = {
  workspaceDir: "",
  packageVersion: "",
  dependencyVersion: "",
  language: {
    detected: false,
    name: "",
    packages: [],
  },
};

describe("loadContentFile", () => {
  beforeEach(() => {
    vol.reset();
    mockedCachedFetch.mockClear();
  });

  it("should read content from a file path", async () => {
    const filePath = "/test.md";
    const fileContent = "Hello, world!";
    vol.fromJSON({ [filePath]: fileContent });

    const contentFile = await loadContentFile({ path: filePath });
    const content = await contentFile.render(renderContext);

    expect(content[0]?.type).toBe("text");
    if (content[0]?.type === "text") {
      expect(content[0]?.text).toBe(fileContent);
    }
  });

  it("should fetch content from a URL", async () => {
    const url = "http://example.com/test.md";
    const fileContent = "Hello, from URL!";
    mockedCachedFetch.mockResolvedValue(new Response(fileContent));

    const contentFile = await loadContentFile({ url });
    const content = await contentFile.render(renderContext);

    expect(mockedCachedFetch).toHaveBeenCalledWith(url);
    expect(content[0]?.type).toBe("text");
    if (content[0]?.type === "text") {
      expect(content[0]?.text).toBe(fileContent);
    }
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
        const contentFile = await loadContentFile({ path: filePath });
        expect(contentFile.frontmatter).toEqual(expected);
      });
    }
  });

  describe("file type detection", () => {
    const tests = [
      {
        desc: "should identify prompt from file extension",
        input: "prompt content",
        path: "/test.prompt",
        expect: "DotpromptFile",
      },
      {
        desc: "should identify prompt from url extension",
        input: "prompt content",
        url: "http://example.com/test.prompt",
        expect: "DotpromptFile",
      },
      {
        desc: "should identify prompt from content type",
        input: "prompt content",
        url: "http://example.com/test",
        contentType: "text/x-dotprompt",
        expect: "DotpromptFile",
      },
      {
        desc: "should identify markdown from file extension",
        input: "markdown content",
        path: "/test.md",
        expect: "MarkdownFile",
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
        let source: ContentFileSource;
        if (path) {
          source = { path };
          vol.fromJSON({ [path]: input });
        } else {
          source = { url: url! };
          if (contentType) {
            source.contentType = contentType;
          }
          const headers = new Headers();
          if (contentType) {
            headers.set("content-type", contentType);
          }
          mockedCachedFetch.mockResolvedValue(new Response(input, { headers }));
        }
        const contentFile = await loadContentFile(source);
        expect(contentFile.constructor.name).toBe(expected);
      });
    }
  });
});
