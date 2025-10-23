# Dotguides

> [!WARNING]
> Dotguides is an experimental project not yet ready for production use.

Dotguides allows open-source library authors to ship high-quality LLM guidance directly inside their packages. Packages with Dotguides can significantly improve the accuracy and quality of code generated for them with popular coding agents.

- **Simple to use:** Dotguides can automatically configure popular coding agents like Gemini CLI, Claude Code, Cursor, and GitHub Copilot.
- **Token-efficient:** Dotguides automatically aggregates and organizes guidance across many packages into a single cohesive system. Dotguides uses progressive disclosure to keep context compact and relevant.
- **Trustworthy:** Because the guidance content is delivered along with open-source packages it can be trusted to the same level as the dependency itself.

To integrate with Dotguides, library authors need only include a `.guides` folder following the specification in the distributed package. See the [Author's Guide](./docs/authors.md) for more information about adding Dotguides to your package.

## Getting Started

> [!NOTE]
> For information about adding Dotguides to your package, see the [Author's Guide](./docs/authors.md).

Dotguides currently supports:

* **Languages:** JS, Python, Go, Dart
* **Agents:** Gemini CLI, Claude Code, Cursor, GitHub Copilot

To start using Dotguides, install the CLI:

```shell
npm i -g dotguides
```

Then, in the application directory where you have your dependency file (e.g. `package.json` or `pyproject.toml`), run:

```shell
dotguides up
```

This interactive setup guide will detect if any of your current dependencies support Dotguides and, if so, help you configure your coding agent to leverage Dotguides while coding.

That's it! Once configured, Dotguides guidance will be automatically injected into your coding agent's workflow so you can just prompt to complete tasks as normal.

## Dotguides CLI

The `dotguides` package runs as an MCP server by default but has other capabilities for aiding in the development, testing, and discovery of dotguides content.

```
USAGE
  dotguides <command> [options]

USER COMMANDS
  up           Configures and activates dotguides for the current workspace.
                 --auto                 Automatically configure with default settings.
                 --ask                  Prompt for all configuration options.
  discover     Discovers all .guides packages in the current workspace.
  inspect      Inspects a specific dotguides package in the current workspace.
                 <package-name>         The name of the package to inspect.
SYSTEM COMMANDS
  mcp          Starts the MCP (Multi-Context Prompt) server.
                 [workspace...]         A list of workspace directories to load (defaults to current).
  rules        Outputs the system instructions for the current workspace.

AUTHOR COMMANDS
  create       Creates a starter .guides directory in the current directory.
  check        Lint/inspect the guidance in the current directory.
  hook         Outputs system instructions for the current workspace.
                 --agent <agent-name>   e.g. "claude-code" or "gemini-cli"
```
