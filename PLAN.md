# `dotguides up` Interactive Mode Implementation Plan

This document outlines the plan to enhance the `dotguides up` command with interactive features for package selection, agent detection, and configuration.

## Milestones

### Milestone 1: Project Setup and Dependencies

- [x] **Add Dependencies:**
  - [x] Add `@clack/prompts` to `package.json`.
- [x] **Create New Files:**
  - [x] `src/lib/interactive.ts`: For the core logic of the interactive prompts.
  - [x] `src/lib/interactive.test.ts`: For testing the interactive logic.
  - [x] `src/lib/settings.ts`: For managing the `.guides.config.json` file.
  - [x] `src/lib/settings.test.ts`: For testing the settings management.
  - [x] `src/lib/agents/index.ts`: For the agent adapter pattern and detection logic.
  - [x] `src/lib/agents/types.ts`: For the base `AgentAdapter` interface.
  - [x] `src/lib/agents/gemini-cli.ts`: For the Gemini CLI adapter implementation.
  - [x] `src/lib/agents/gemini-cli.test.ts`: For testing the Gemini CLI adapter.

### Milestone 2: Package Discovery and Selection

- [x] **Discover Packages:**
  - [x] In `src/lib/workspace.ts`, enhance `discoverPackages` to return a list of packages with guidance.
  - [x] Handle the case where no packages are found.
- [x] **Implement Multi-Select Prompt:**
  - [x] In `src/lib/interactive.ts`, create a function that takes the list of packages and uses `@clack/prompts` to show a multi-select prompt.
  - [x] This function should return the list of selected packages.
  - [x] Show newly discovered packages first with a `(new!)` label.
- [x] **Update `up` command:**
  - [x] In `src/cli/commands/up.ts`, call the new interactive package selection function.
  - [x] If no packages are discovered, log a warning and exit.
- [x] **Manage Disabled and Discovered Packages:**
  - [x] In `src/lib/settings.ts`, implement functions to read and write the `{"packages": {"disabled": [...], "discovered": [...]}}` configuration to `.guides.config.json`. When reading settings read both `./.guides.config.json` and `~/.guides.config.json` (workspace takes precedence over user but they should be merged together).
  - [x] In `src/cli/commands/up.ts`, use the settings functions to save the list of unselected packages to the `disabled` list and all discovered packages to the `discovered` list.
  - [x] The package discovery logic should respect this setting and not show disabled packages as selected by default.
- [x] **Make `up` command robust:**
  - [x] Ensure that the `dotguides up` command ignores the `.guides` directory in the workspace root for the purpose of package discovery.

### Milestone 3: Coding Agent Detection and Selection

- [x] **Define Agent Adapter:**
  - [x] In `src/lib/agents/types.ts`, define an `AgentAdapter` interface with methods like `name()`, `detect(workspaceDir: string)`, and `up(workspaceDir: string, config: ...)`.
- [x] **Implement Gemini CLI Adapter:**
  - [x] In `src/lib/agents/gemini-cli.ts`, create a `GeminiCliAdapter` that implements the `AgentAdapter` interface.
  - [x] The `detect()` method will check for the existence of a `GEMINI.md` file or a `.gemini` directory in the workspace.
  - [x] The `up()` method will contain the logic to write `DOTGUIDES.md` and update `.gemini/settings.json`.
- [x] **Implement Agent Detection Logic:**
  - [x] In `src/lib/agents/index.ts`, create a function that iterates through all available adapters and calls `detect()` on each, passing the workspace directory.
  - [x] It should return the first adapter that returns `true`.
- [x] **Implement Agent Selection Prompt:**
  - [x] In `src/lib/interactive.ts`, create a function that uses `@clack/prompts` to show a select prompt with the list of available agents if no agent is detected automatically.
  - [x] Include a "None of These" option that, if selected, will cause the program to exit with an error.
- [x] **Update `up` command:**
  - [x] In `src/cli/commands/up.ts`, call the agent detection and selection logic, passing the workspace directory.

### Milestone 4: Configuration Profile Selection

- [ ] **Define Configuration Profiles:**
  - [ ] Define what "Balanced (default)", "Compact", and "Verbose" mean. This will likely translate to different sets of prompts or context provided to the agent.
  - [ ] For example:
    - **Compact:** Minimal context, just the essentials.
    - **Balanced:** A good mix of context and brevity.
    - **Verbose:** Maximum context, including extended explanations.
- [ ] **Implement Profile Selection Prompt:**
  - [ ] In `src/lib/interactive.ts`, create a function that uses `@clack/prompts` to show a select prompt for the configuration profile.
- [ ] **Apply Configuration:**
  - [ ] The `up()` method of the `AgentAdapter` will take the selected profile as an argument.
  - [ ] The adapter will be responsible for using the profile to adjust the MCP server setup (e.g., by selecting different prompt templates).
- [ ] **Update `up` command:**
  - [ ] In `src/cli/commands/up.ts`, call the profile selection logic and pass the result to the agent's `up()` method.

### Milestone 5: Integration and Testing

- [ ] **Refactor `dotguides up`:**
  - [ ] Modify `src/cli/commands/up.ts` to orchestrate the new interactive flow.
  - [ ] The command should now:
    1.  Discover packages.
    2.  Prompt user to select packages.
    3.  Save disabled and discovered packages setting.
    4.  Detect or prompt for the coding agent.
    5.  Prompt for the configuration profile.
    6.  up the agent and start the MCP server with the selected configuration.
- [ ] **Write Unit Tests:**
  - [ ] Add Vitest unit tests for all new logic in `src/lib/`.
  - [ ] Focus on testing the package selection, settings management, agent detection, and adapter logic.
  - [ ] Use table-style tests where appropriate.
