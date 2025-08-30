Dotguides is a library, CLI, and MCP server for automatically discovering LLM-friendly documentation for open source packages. It is written in TypeScript but is built to discover documentation in any language.

## Repo Structure

- `src/lib`: main library code, all significant logic should be encapsulated here
- `src/cli`: CLI code, leverages library code for logic
- `src/mcp`: MCP server code, leverages library code for logic and started with `dotguides mcp` CLI command

## General Guidance

- Before completing a task, run `pnpm test` to make sure tests are passing.
- Add Vitest unit tests for behavior you add or change in `src/lib`, creating new test files as necessary.
- When writing tests, prefer "table-style" tests with a `{desc, input, expect}[]` format to describe each test.
- DO NOT DELETE TEST FILES after they pass. Tests are good, keep them around.
