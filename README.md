# Dotguides

> [!WARNING]
> Dotguides is an experimental project not yet ready for production use.

Dotguides is a convention for LLM-focused documentation and configuration that can be automatically discovered through existing package managers.

To integrate with Dotguides, library authors need only include a `.guides` folder following the specification in the distributed package.

The Dotguides MCP server will automatically discover and serve documentation and configuration for any package that includes a `.guides` folder.

Dotguides supports JavaScript (through a variety of package managers) and Dart (through pub). Support for additional package systems welcome!

## Dotguides MCP Server

The Dotguides MCP server allows you to leverage the full guidance content of your project's dependencies with a single command. Add it to your project using:

```
{
  "mcpServers": {
    "dotguides": {
      "command": "npx",
      "args": ["-y", "dotguides@latest"]
    }
  }
}
```

The Dotguides MCP server includes the following capabilties:

- **Tools:**
  - `load_guidance(packages?: string[])`
  - `load_docs(uris: string[])`: If the MCP client does not support resources, this tool allows loading documentation.
- **Prompts:** For each command defined in package dependencies, the Dotguides MCP server will expose an MCP Prompt.
- **Resources:**
  - `guides://{package}/{usage|setup|style}`: Loads the guidance for usage/setup/style for a provided package.
  - `docs://{package}/docs/{path}`: Loads a specific documentation page as a resource.

## Dotguides CLI

The `dotguides` package runs as an MCP server by default but has other capabilities for aiding in the development, testing, and discovery of dotguides content.

### `dotguides init`

This will configure the current workspace for Dotguides usage by installing the Dotguides MCP server for any detected coding agent (or asking if none is detected) as well as prompting you to add the Dotguides rules to your rules files where available.

### `dotguides discover`

This discovers which packages in your current workspace have Dotguides content and also discovers if there are any installable "contrib" libraries for packages in your current workspace.

Contrib packages are trusted Dotguides content provided by the Dotguides community for packages that do not natively support it.

### `dotguides rules`

This command outputs "rules" (system instructions) for Dotguides itself as well as any discovered packages with Dotguides usage instructions.

### `dotguides inspect <package_name>`

Provides detailed information about the discovered Dotguides content for the specified package.

## Dotguides Content

Dotguides content is authored as plain text in `.md` or `.prompt` files. Using `.prompt` allows you to leverage additional helpers to dynamically adapt to the user's environment.

### Frontmatter

Both content formats support YAML frontmatter for metadata.

```
---
description: A brief description of the guide.
relevantQueries:
  - "semantic query that should return this guide"
  - "another semantic query"
---

Content goes here.
```

### Helpers

#### Partials

In your `.guides` folder you can create a `partials` folder that contains reusable snippets. These can be included in any `.prompt` file using the Handlebars partial syntax. Partials are named based on their path (without extension) relative from the `partials` directory:

```handlebars
{{> "partial/name" }}
```

#### `hasDependency`

The `hasDependency` helper lets you check for related dependencies. For example, if your library has specific ways to integrate with various web frameworks, you can detect which framework if any they have installed to include additional guidance.

```handlebars
{{#if (hasDependency "package_name" "<1.0.0")}}
```

### workspaceFile

The `workspaceFile` helper lets you include the content files from the local workspace in your guides. This is useful for providing the current contents of configuration files, for example.

```handlebars
{{workspaceFile "some.config.ts"}}
```

### Linking Content

Within a guide file you can link to other docs in your guides using simple markdown links:

```md
[link text](doc:some/doc/name)
```

Dotguides will automatically translate this into the full resource URI for the actual guide when served by the Dotguides MCP server.

## Authoring Dotguides Content

To author Dotguides content, you will need to create a `.guides` folder in the root of your project.

### `.guides/config.json`

Main `.guides` configuration file.

```js
{
  // Specify any MCP servers used by your library.
  "mcpServers": {
    "<serverName>": {
      "command": "...",
      "args": ["..."]
    },
    "<anotherServerName>": {
      "url": "..."
    }
  },
  // For all Dotguides contnt, you can optionally provide links
  // to URLs instead of embedding them in the `.guides` folder.
  "guides": {
    "setup": {"description": "...", ""url": "..."},
    "usage": {"description": "...", ""url": "..."},
    "style": {"description": "...", ""url": "..."},
  },
  "docs": [
    {"name": "some/doc/name", "description": "...", "url": "..."}
  ],
  "commands": [
    {
      "name": "command_name",
      "description": "...",
      "arguments": [/* matches MCP Prompt arguments */],
    }
  ]
}
```

### `.guides/usage.{md|prompt}`

The usage file provides high-level usage information for guiding LLMs in correct usage of the library. Usage instructions are meant to be included in e.g. a system prompt and should be as terse and concise as possible.

Think of the usage file as being a way to correct common mistakes made by LLMs when using your library - it is a good place to provide compact information about breaking changes from previous versions or a few critical examples for core functionality.

### `.guides/style.{md|prompt}`

The style file provides guidance on the stylistic conventions and best practices for using the library. It is separate from the usage guide to allow users to allow users to override / opt-out of optional "style" that is more of a preference than core behavior.

### `.guides/setup.{md|prompt}`

The setup file should provide step-by-step instructions for configuring and integrating your library.

- You can assume that the agent interpreting the instructions can read and write files in the project directory and run non-interactive shell commands.
- Do not assume any particular "start" state of the project like a fresh template. Write clear instructions for how to find out the current state of your library's use in the project.

### `.guides/docs/**/*.{md|prompt}`

Docs are hierarchical documentation files that can be indexed and discovered by the coding agent using your guidance.

- Try to keep documentation pages concise and focused on a single topic.
- Use examples and include raw interface definitions -- your audience is an LLM, not a human.
- Top-level `docs/*` files will be listed by default, docs in subdirectories may be indexed for searching but are not listed.
- You can link to deeply nested docs using `doc:some/nested/doc`

### `.guides/commands/{command_name}.{md|prompt}

Commands are library-specific tasks that can be manually invoked by the user to perform specific actions. If your library has common repeated tasks (e.g. creating a new route for a web framework) you can define it in a command file.

Commands are exposed as MCP prompts namespaced by your library's package name. Command frontmatter may include `arguments` that are required to invoke the command.

```
---
arguments:
  - name: arg_name
    description: What the argument should be.
    required: true # optional, defaults to false
---
```
