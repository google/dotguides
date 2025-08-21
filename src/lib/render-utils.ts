function _render(obj: Record<string, any>, indent: string = ""): string {
  return Object.entries(obj)
    .map(([key, value]) => {
      if (value === undefined) {
        return null;
      }
      const prefix = `${indent}${key}:`;
      if (value === null) {
        return `${prefix} <none>`;
      }
      if (Array.isArray(value)) {
        return `${prefix} ${value.join(", ")}`;
      }
      if (typeof value === "object") {
        const nested = _render(value, indent + "  ");
        if (nested) {
          return `${prefix}\n${nested}`;
        }
        return `${prefix} {}`;
      }
      return `${prefix} ${value}`;
    })
    .filter((line) => line !== null)
    .join("\n");
}

export function renderDetails(obj: Record<string, any>): string {
  return _render(obj);
}

export function section(
  options: {
    name: string;
    attrs?: Record<string, string>;
    condition?: any;
  },
  content: string | string[] | undefined | null
) {
  if (options.condition === false || !content) return "";
  if (Array.isArray(content)) content = content.join("\n");
  return `<${options.name}${
    options.attrs
      ? " " +
        Object.entries(options.attrs)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ")
      : ""
  }>\n${content.trim()}\n</${options.name}>`;
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  }
  if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}

export function countTokens(content: string): number {
  return Math.round(content.length / 4);
}
