import { InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { prompt } from "../prompt.js";

export const guided = prompt(
  {
    name: "guided",
    description: "Include relevant guidance from installed packages.",
    arguments: [{ name: "prompt", required: true }],
  },
  (args, { workspace }) => {
    if (!args.prompt) {
      throw new InvalidRequestError("The 'prompt' argument is required.");
    }
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${workspace.systemInstructions({
              listDocs: true,
            })}\n\n===== USER PROMPT ====\n\n${args.prompt}`,
          },
        },
      ],
    };
  }
);
