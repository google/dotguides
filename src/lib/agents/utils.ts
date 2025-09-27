export function appendOrUpdate(
  existingContent: string,
  instructions: string,
): string {
  const lines = existingContent.split("\n");
  const startTag = "<dotguides>";
  const endTag = "</dotguides>";

  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }
    if (line.trim() === startTag) {
      startIndex = i;
    } else if (line.trim() === endTag) {
      endIndex = i;
    }
  }

  if (startIndex !== -1 && endIndex === -1) {
    throw new Error("Found <dotguides> but no closing </dotguides>");
  }

  if (startIndex !== -1 && endIndex !== -1) {
    const newLines = [
      ...lines.slice(0, startIndex + 1),
      instructions,
      ...lines.slice(endIndex),
    ];
    return newLines.join("\n");
  } else {
    return `${existingContent}\n\n${startTag}\n${instructions}\n${endTag}`;
  }
}
