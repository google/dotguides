export const CONFIG_JSON_CONTENT = `{
  "description": "A set of guides for interacting with this awesome library.",
  "mcpServers": {
    "your_library": {
      "command": "some-mcp-command",
      "args": ["arg1", "arg2"]
    }
  }
}
`;

export const USAGE_PROMPT_CONTENT = `The usage guide should be a concise (<1K tokens) summary of the most important usage information for your library.

- Consider mentioning that that package is version {{ @packageVersion }} to help ground the model.
- Test your usage guide against common tasks to see if it improves model accuracy.`;

export const TOPIC_PROMPT_CONTENT = `---
title: Topic One
description: read this doc to learn more about a specific topic
---
Create docs files for detailed topical guides for your library. Top-level files may be automatically listed
`;
