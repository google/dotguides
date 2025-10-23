# Dotguides Author Guide

# Introduction

Dotguides is a simple and powerful way to provide high-quality contextual guidance to LLM coding agents. To integrate with Dotguides, you need only to distribute a `.guides` folder with content as described in the guide below with your package. The Dotguides CLI and MCP server take care of everything else necessary to deeply integrate with many popular coding agents.

Benefits of Dotguides integration:

* **Simple but powerful.** Dotguides content can be as simple as a few Markdown files but grows with your needs to high-scale complex documentation.

* **Strong conventions.** Dotguides provides a few key "guides" (usage, style, setup, and upgrade) that can help your users on their most common journeys.

* **Always up to date.** Because Dotguides content is versioned with your code and delivered with your package, you can be certain that users always have the correct guidance to go with the specific version of your library that they are using.

* **Dynamically tailored guidance.** Dotguides allows you to insert the content of config files or even the output of shell commands into your provided guidance or conditionally add additional instructions based on the detection of a sibling dependency (e.g. a specific web framework).

* **Reduced tool load.** Dotguides provides a single set of MCP tools to read and consume guidance and documentation across a user's entire set of dependencies. This avoids confusing models with duplicative and overlapping tools from many different libraries.

# Discovery

Dotguides automatically discovers and surfaces guidance and documentation from a `.guides` folder inside your package's distributed folder. This folder **MUST** be at the top level of your distributed package. For example, in JS, for package `shiny-things` Dotguides would look for:

```
node_modules/shiny-things/.guides
```

Make sure the `.guides` folder is not ignored or excluded from bundling in your package (for example, in JS via e.g. `.npmignore` or omission from the `files` array in `package.json`).

## List of Supported Languages

* **Available Now**
  * JS
  * Dart
  * Go
  * Python

*Don't see your library's language here? Join [go/dotguides-chat](https://goto.google.com/dotguides-chat) and talk to us about it\!*

# Getting Started

## 1. Install the Dotguides CLI

```shell
npm i -g dotguides
```

Ensure that installation has been successful by running `dotguides --help` to see that it runs.

## 2. Create a .guides folder

In the root directory of your library's package (it *must* be the root directory of the folder that your package is distributed as) run:

```shell
dotguides create
```

This will create a scaffold of `.guides` content that can help you get started authoring your own. You can create the files on your own if you prefer.

## 3. Write some basic guidance

Write some basic guidance for your library. The simplest place to start is with a [usage file](#usage.{md|prompt}) since it is automatically included in the generated system context file. If you have an MCP server that is meant to be used by coding agents when using your library, add it to [config.json](#dotguides-config).

**IMPORTANT:** Don't waste your users' tokens! Especially for your usage file, keep it short and sweet.

Once you've written some guidance, you can perform a quick check to make sure the Dotguides tooling picks it all up as expected:

```shell
dotguides check
```

## 4. Configure Gemini CLI

Install the local version of your library into a test application directory (using e.g. `npm link` for JS packages). In the application's root directory, run:

```shell
dotguides up
```

The `dotguides up` command will prompt you to configure Dotguides for one of the supported coding agents, and may create new configuration / artifacts in the workspace directory.

When your coding agent starts up, you should see the Dotguides MCP server active.

## 5. Test your guidance

Now you're ready to give it a "real world road test" and see if your guidance is working:

1. Ask the agent directly questions about things you know should be in your guidance. If you have a "Wiring up Frobulators" doc, ask the agent "how do I wire up frobulators?"
2. Ask Gemini CLI to perform a coding task that should be influenced by your guidance. See if it appears to be following the guidance.

Based on your results, continue iterating on your guidance.

## 6. Publish your guidance

Because Dotguides leverages existing package ecosystems, publishing your guidance is simple. Just check it into your repository like you would any other change, and publish a new version of your library\!

Once it's published, installing your library into a project will automatically make it discoverable by the Dotguides tooling.

**Note:** Don't worry about confidentiality in publishing the `.guides` folder, but don't mention Dotguides by name. Make your PR title something innocuous like "adding coding agent guidance files".

# Folder Structure

Everything in the `.guides` folder is optional -- whatever content you place there will be made available.

```shell
.guides/
  config.json # config file, see interface below

  # core guides - automatically used in appropriate contexts
  usage.{md|prompt} # (<= 1K tokens)
  style.{md|prompt} # (<= 1K tokens)
  setup.{md|prompt}
  upgrade.{md|prompt}

  # documentation - referenceable from guides, discoverable by agents
  docs/*.{md|prompt}     # top level docs, <= 10 total
  docs/**/.*.{md|prompt} # nested hierarchical docs, as many as needed

  # commands - directly invokable by end users
  commands/*.{md|prompt}

  # examples - referenceable from guides, discoverable by agents
  examples/**/*.*
```

# Dotguides Content

 If you aren’t sure about the token size of your files, `dotguides check` will provide that information for you.

## `usage.{md|prompt}`

The usage guide is the most impactful Dotguides content as it is intended to be automatically included in the system prompt of integrating coding agents. Your usage guide should be as brief as possible, often just a short bulleted list of concise instructions to either (a) use your package correctly or (b) know when and how to read documentation to do so.

* Usage guides should be **AT MOST 1K tokens** in length.
* Think of it as explaining the most crucial bits in 30 seconds to someone with a vague understanding of your library (but maybe a couple major versions ago).
* Stick to core capability guidance, not "best practices" or opinionated style.

## `style.{md|prompt}`

The style guide provides optional "best practices" that can be more opinionated than the usage guide. It may be included in the system prompt or omitted entirely depending on the user's preferences.

* Style guides should be **AT MOST 1K tokens** in length.

## `setup.{md|prompt}`

The setup guide provides a step-by-step "playbook" for getting your library up and running. It is not included in the system prompt but is exposed through custom slash commands or automated install processes.

* Setup guides can be arbitrary length **(recommend \<10K tokens)**.
* Assume the guide may be run from **any** workspace state, from an empty repo to already completely configured.
* Make sure the instructions don't lead agents to overwrite existing user configuration and short-circuit steps that are already complete.
* You can provide instructions to look up files, ask the user questions \- anything that is necessary for your library to be fully setup and usable.

## `upgrade.{md|prompt}`

The upgrade guide should provide guidance for upgrading from a previous version of your library to the most recent. There is no way to know the specific version being upgraded from, so the guide should be general-purpose and cover all breaking changes for the version ranges you wish to support.

Upgrade guides, like setup guides, are invoked directly.

* Upgrade guides can be arbitrary length (**recommend \<10K tokens**)
* Think about prompting the agent to search for certain specific code patterns you want to address / upgrade.

## `docs/**/*.{md|prompt}`

Docs provide detailed topic-based information about using your library that can be retrieved on-demand by the agent using the Dotguides `read_docs` MCP tool.

* Docs are hierarchical (you can have nested folders). **Limit top-level docs to \<= 10**, nesting deeper topics inside folders matching the top-level doc (e.g. `.guides/docs/deployment.md` and `.guides/docs/deployment/provider-one.md`).
* Descriptions should *tell agents when they should read the doc*, for example: "read this to understand how to build multi-step workflows".
* You can reference docs within themselves or within guides to refer the agent, for example "for more about deployment, see docs:{package\_name}/deployment". Make sure to add the `docs:` prefix and don't add a file extension when referencing docs in your content.

## `commands/*.{md|prompt}`

Commands allow you to define custom slash commands that will be available in any agent that supports MCP Prompts (e.g. Gemini CLI, Claude Code, Cursor, and Copilot). Commands can optionally have *arguments* that are passed to guide the behavior.

* Commands are exposed with a package name prefix, e.g. a command called `audit` in a package called `foo` would be exposed as `foo:audit`.
* There is no set token limit on commands, you can think of them as being step-by-step guides.
* You can instruct the model to read/write files, run terminal commands, or call MCP tools that are included in your Dotguides package.
* You can instruct the model to ask the user clarifying questions as needed.

Arguments are specified in frontmatter and consumed using \`{{ arg\_name }}\` templates. Example:

```
---
description: a basic description of what the command does
arguments:
  - name: arg1
    description: what the argument is for
    required: true # optional, defaults to false
  - name: arg2
    description: another description
---

Arg1 Value: {{ arg1 }}
{{#if arg2}}Arg2 Value: {{arg2}}{{/if}}
```

## [COMING SOON] `examples/**/*.*`

A collection of code snippets and samples for your library.

# `Dotguides Config` {#dotguides-config}

The `.guides/config.json` provides centralized configuration for your package's Dotguides content and settings. The file has the following schema:

```ts
interface ContentConfig {
  /** Identifying name of the content. */
  name: string;
  /** Concise description of the purpose of the content. */
  description?: string;
  /** Human-friendly title for the content. */
  title?: string;

  // one of the following
  /** File path relative to the .guides folder */
  path?: string;
  /** URL pointing to the content. Content of URL is expected to be plaintext. */
  url?: string;
}

interface CommandConfig extends ContentConfig {
  /** Positional arguments that can be supplied to the command. */
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[]
}

interface DotguidesConfig {
  /** A description of the purpose of the package for dynamic discovery purposes. */
  description?: string;
  /** Configuration MCP servers that should be active while using this library. */
  mcpServers?: Record<
    string,
    { command: string; args: string[] } | { url: string }
  >;
  /** Array of guides (must have name of 'usage', 'style', 'setup', or 'upgrade'. */
  guides?: ContentConfig[];
  /** Array of docs definitions. */
  docs?: ContentConfig[];
  /** Array of command definitions. */
  commands?: CommandConfig[];
  /** Array of partials which can be included in .prompt templates */
  partials?: PartialConfig[];
}
```

Content that is defined in the conventional location inside the `.guides` folder does not need to be enumerated inside `config.json`.

# Dotprompt Templates

Dotguides is natively integrated with [Dotprompt](https://google.github.io/dotprompt/) to allow richer template logic inside of guides and documentation. Inside your templates, you can use the provided context variables and helpers to enrich your content.

To leverage Dotprompt, use the `.prompt` extension on your content files instead of `.md`.

## Context Variables

Use context variables to insert metadata about the current environment into your template.

```
{{ @varName }} <-- use like this
{{#ifEquals @varname "someValue" }} <-- or like this
```

Context interface (top-level fields are `@{fieldName}`):

```ts
export interface RenderContext {
  workspaceDir: string;
  /** The actual specific exact package version installed. */
  packageVersion: string;
  /** The package version as declared in the dependency file (e.g. semver range). */
  dependencyVersion: string;
  /** Context about the current language, package manager, runtime, etc. */
  language: {
    /** The name of the language */
    name: string;
    /** Which package manager is being used in the current workspace. */
    packageManager?: string;
    /** Which runtime (e.g. nodejs, bun, deno for JS) is being used. */
    runtime?: string;
    /** The version of the runtime (e.g. '22.14.7' for Node.js or '1.24.2' for go). */
    runtimeVersion?: string;
  };
  /** Optional information that supplies info about the current environment. */
  hints?: {
    /** The MCP client currently connected if known. */
    mcpClient?: { name: string; version: string };
    /** If the specific model being used for inference is known, it will be supplied here. */
    modelName?: string;
  };
}
```

## Helpers

Dotguides adds a number of additional helpers on top of the [built-in Dotprompt helpers](https://google.github.io/dotprompt/reference/template/#built-in-helpers) to provide more powerful context management:

```
Insert a file's content from the current workspace:
{{ workspaceFile "path/to/file.ts" }}

Insert a file's content relative to package dir:
{{ packageFile "path/to/file.md" }}

Run a command and insert the results:
{{ runCommand "echo 'hello world'" }}

Check for dep:
{{#if (hasDependency "some_package") }}
...or with semver range
{{#if (hasDependency "some_package" ">=2.0.0") }}

Check for substring match:
{{#if (contains @hints.modelName "gemini") }}
```
