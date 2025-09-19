/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

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
