# Dotguides

> [!WARNING]
> Dotguides is an experimental project not yet ready for production use.

Dotguides is a convention for LLM-focused documentation and configuration that can be automatically distributed and discovered through existing package managers.

To integrate with Dotguides, library authors need only include a `.guides` folder following the specification in the distributed package.

The Dotguides MCP server and toolchain will automatically discover and serve documentation and configuration for any package that includes a `.guides` folder.

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
