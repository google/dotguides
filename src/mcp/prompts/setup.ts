import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { prompt } from "../prompt.js";

export const setup = prompt(
  {
    name: "setup",
    description: "Get setup instructions for a package.",
    arguments: [{ name: "package", required: true }],
  },
  async (args, { workspace }) => {
    if (!args.package) {
      throw new InvalidRequestError("The 'package' argument is required.");
    }
    const pkg = workspace.packageMap[args.package];
    if (!pkg) {
      throw new InvalidRequestError(`Package '${args.package}' not found.`);
    }
    const setupGuide = pkg.guides.find((g) => g.config.name === "setup");
    if (!setupGuide) {
      throw new InvalidRequestError(
        `Setup guide not found for package '${args.package}'.`
      );
    }
    const content = await setupGuide.render(pkg.renderContext());
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: content.map((c) => ("text" in c ? c.text : "")).join("\n"),
          },
        },
      ],
    };
  }
);
