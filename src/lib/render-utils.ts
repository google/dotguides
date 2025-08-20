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
  options: { name: string; attrs?: Record<string, string> },
  content: string
) {
  return `<${options.name}${
    options.attrs
      ? " " +
        Object.entries(options.attrs)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ")
      : ""
  }>\n${content}\n</${options.name}>`;
}
