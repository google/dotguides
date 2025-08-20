# Implementation Plan

[Overview]
This document outlines the plan to build the Dotguides MCP Server, CLI, and supporting libraries from scratch, structuring the codebase into three core folders: `src/lib`, `src/mcp`, and `src/cli`, with `vitest` for unit testing.

The project aims to create a high-quality, long-lasting open-source tool for LLM-focused documentation and configuration. The implementation will be broken down into milestones to ensure a modular and testable codebase.

[Types]
This section defines the core data structures and types for Dotguides content and configuration.

```typescript
// src/lib/types.ts

export interface GuideConfig {
  description: string;
  url?: string;
}

export interface DocConfig {
  name: string;
  description: string;
  url?: string;
}

export interface CommandArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface CommandConfig {
  name: string;
  description: string;
  arguments: CommandArgument[];
}

export interface DotguidesConfig {
  mcpServers?: Record<
    string,
    { command: string; args: string[] } | { url: string }
  >;
  guides?: {
    setup?: GuideConfig;
    usage?: GuideConfig;
    style?: GuideConfig;
  };
  docs?: DocConfig[];
  commands?: CommandConfig[];
}
```

[Files]
This section details the file structure and modifications.

**New Files:**

- `src/lib/types.ts`: Contains all the core type definitions.
- `src/lib/language-adapter.ts`: Defines the `LanguageAdapter` interface.
- `src/lib/content-file.ts`: The `ContentFile` class.
- `src/lib/guide.ts`: The `Guide` class.
- `src/lib/doc.ts`: The `Doc` class.
- `src/lib/command.ts`: The `Command` class.
- `src/lib/guides-package.ts`: The `Package` class.
- `src/lib/guides-workspace.ts`: The `Workspace` class.
- `src/lib/languages/javascript.ts`: The `JavascriptLanguageAdapter` implementation.
- `src/mcp/server.ts`: The main Dotguides MCP server implementation.
- `src/mcp/index.ts`: Entry point for the MCP server.
- `src/cli/index.ts`: Main entry point for the `dotguides` CLI.
- `src/cli/commands/init.ts`: Implementation for the `dotguides init` command.
- `src/cli/commands/discover.ts`: Implementation for the `dotguides discover` command.
- `src/cli/commands/rules.ts`: Implementation for the `dotguides rules` command.
- `src/cli/commands/inspect.ts`: Implementation for the `dotguides inspect` command.
- `vitest.config.ts`: Configuration for Vitest.
- `src/lib/content-file.test.ts`: Unit tests for the `ContentFile` class.
- `src/lib/guide.test.ts`: Unit tests for the `Guide` class.
- `src/lib/doc.test.ts`: Unit tests for the `Doc` class.
- `src/lib/command.test.ts`: Unit tests for the `Command` class.
- `src/lib/guides-package.test.ts`: Unit tests for the `Package` class.
- `src/lib/guides-workspace.test.ts`: Unit tests for the `Workspace` class.
- `src/lib/languages/javascript.test.ts`: Unit tests for the `JavascriptLanguageAdapter`.

**Modified Files:**

- `package.json`: Add `vitest`, `memfs`, and other dependencies.
- `tsconfig.json`: Ensure configuration is optimal for the project.

[Functions]
This section describes the key functions to be implemented.

**New Functions:**

- `runCli()` in `src/cli/index.ts`: Parses command-line arguments and executes the appropriate command.
- `initCommand()` in `src/cli/commands/init.ts`: Implements `dotguides init`.
- `discoverCommand()` in `src/cli/commands/discover.ts`: Implements `dotguides discover`.
- `rulesCommand()` in `src/cli/commands/rules.ts`: Implements `dotguides rules`.
- `inspectCommand(packageName: string)` in `src/cli/commands/inspect.ts`: Implements `dotguides inspect`.

[Classes]
This section describes the class-based architecture.

- **`ContentFile`** (`src/lib/content-file.ts`): Base class for file-based content.
- **`Guide`** (`src/lib/guide.ts`): Extends `ContentFile`.
- **`Doc`** (`src/lib/doc.ts`): Extends `ContentFile`.
- **`Command`** (`src/lib/command.ts`): Extends `ContentFile`.
- **`Package`** (`src/lib/guides-package.ts`): Represents the `.guides` content for a single package.
- **`Workspace`** (`src/lib/guides-workspace.ts`): Represents all discovered `Package` instances in a workspace.
- **`JavascriptLanguageAdapter`** (`src/lib/languages/javascript.ts`): Implements the `LanguageAdapter` for JavaScript projects.

[Dependencies]
This section outlines the required dependencies.

**New Dependencies:**

- `vitest`
- `memfs`
- `glob`
- `js-yaml`

[Testing]
This section describes the testing approach.

Unit tests are co-located with the source files, using a `.test.ts` extension. The file system is mocked using `memfs`.

[Implementation Order]
This section provides the step-by-step implementation sequence.

1.  **Project Setup - COMPLETE**: Configured `vitest` and updated `package.json` with new dependencies and scripts.
2.  **Core Library (`src/lib`) - COMPLETE**:
    - Implemented all core classes and types.
    - Implemented the language adapter mechanism for discovering packages.
    - Wrote unit tests for all core library components.
3.  **CLI (`src/cli`)**:
    - Set up the main CLI entry point in `src/cli/index.ts` using `util.parseArgs`.
    - Implement the `discover` command.
    - Implement the `inspect` command.
    - Implement the `rules` command.
    - Implement the `init` command.
4.  **MCP Server (`src/mcp`)**:
    - Implement the MCP server in `src/mcp/server.ts`, leveraging the core library.
    - Expose tools, prompts, and resources as described in `README.md`.
5.  **Integration and Finalization**:
    - Ensure all components are integrated correctly.
    - Add end-to-end tests if necessary.
    - Update `README.md` with any new information.
