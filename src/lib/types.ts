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
