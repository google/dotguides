import z from "zod";
import { tool } from "../tool.js";
import { section } from "../../lib/render-utils.js";

export const read_docs = tool(
  {
    name: "read_docs",
    title: "Read Documentation",
    description:
      "Use this tool to load one or more docs files discovered via Dotguides.",
    inputSchema: z.object({
      uris: z
        .array(z.string())
        .describe(
          "list of docs uris to load, usually in the form `docs:{packageName}:${path/to/doc}`"
        ),
    }),
  },
  ({ uris }, { workspace }) => {
    const docs = uris.map((uri) => {
      const [_, pkg, name] = uri.split(":");
      return { pkg, name, doc: workspace.doc(pkg, name) };
    });

    console.error(docs.map((d) => d.doc?.content.substring(0, 200)));

    return {
      content: docs
        .filter((d) => !!d.doc)
        .map(({ doc, pkg, name }) => ({
          type: "text" as const,
          text: section(
            { name: "doc", attrs: { package: pkg, name } },
            doc ? doc.render({}) : null
          ),
        }))
        .filter((c) => !!c.text),
    };
  }
);
