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

export const USAGE_PROMPT_CONTENT = `The following are rules for using this library.

- DO use the library to do awesome things.
- DO NOT use the library to do evil things.

For more information, see the following docs:

{{#each docs}}
- {{this.name}}: {{this.description}}
{{/each}}
`;

export const TOPIC_PROMPT_CONTENT = `---
name: topic
description: Read this doc to learn more about a specific topic
---
This document provides more information about a specific topic.
`;
