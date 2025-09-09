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
          "list of docs uris to load, usually in the form `docs:{packageName}:{path/to/doc}`"
        ),
    }),
  },
  async ({ uris }, { workspace }) => {
    const docs = uris.map((uri) => {
      const [_, pkg, name] = uri.split(":");
      return { pkg, name, doc: workspace.doc(pkg, name) };
    });

    const renderedContent = await Promise.all(
      docs
        .filter((d) => !!d.doc)
        .map(async ({ doc, pkg, name }) => {
          if (!doc) {
            return null;
          }
          const content = await doc.render({
            workspaceDir: "",
            packageVersion: "",
            dependencyVersion: "",
            language: {
              detected: false,
              name: "",
              packages: [],
            },
          });
          const text = content
            .map((c) => ("text" in c ? c.text : ""))
            .join("\n");
          return {
            type: "text" as const,
            text: section({ name: "doc", attrs: { package: pkg, name } }, text),
          };
        })
    );

    return {
      content: renderedContent.filter((c) => !!c),
    };
  }
);
