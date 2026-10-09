/**
 * Repairs artifacts commonly introduced when Markdown is copied through rich
 * text editors. Code fences and inline code are deliberately left untouched.
 */
export interface NormalizeMarkdownOptions {
  quoteBreakStyle?: "html" | "markdown" | "none";
}

export function normalizeImportedMarkdown(
  markdown: string,
  options: NormalizeMarkdownOptions = {}
): string {
  const quoteBreakStyle = options.quoteBreakStyle ?? "html";
  const lines = markdown.split("\n");
  let fence: string | null = null;

  const normalized = lines.map((line) => {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch?.[1]) {
      const marker = fenceMatch[1][0] ?? "`";
      if (fence === marker) fence = null;
      else if (!fence) fence = marker;
      return line;
    }
    if (fence) return line;

    return transformOutsideInlineCode(line);
  });

  return normalized.map((line, index) => {
    const nextLine = normalized[index + 1];
    const isQuoteLine = /^\s*>\s*\S/.test(line);
    const nextIsQuoteLine = typeof nextLine === "string" && /^\s*>\s*\S/.test(nextLine);
    if (isQuoteLine && nextIsQuoteLine) {
      if (quoteBreakStyle === "html") return `${line.trimEnd()}<br>`;
      if (quoteBreakStyle === "markdown") return `${line.trimEnd()}  `;
    }
    return line;
  }).join("\n");
}

function transformOutsideInlineCode(line: string): string {
  const codeSpan = /(`+).*?\1/g;
  let result = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = codeSpan.exec(line)) !== null) {
    result += repairMarkdown(line.slice(cursor, match.index));
    result += match[0];
    cursor = match.index + match[0].length;
  }
  result += repairMarkdown(line.slice(cursor));
  return closeUnmatchedStrong(result);
}

function repairMarkdown(text: string): string {
  return decodeNumericEntities(text)
    .replace(/&#x20;|&#32;|&nbsp;/gi, " ")
    .replace(/^([ \t]*)\\>/, "$1>")
    .replace(/\\\*\\\*/g, "**")
    .replace(/\\_\\_/g, "__")
    .replace(/\*{4}([^*\n]+?)\*{4}/g, "**$1**")
    .replace(/\\(#{1,6})(?=\s)/g, "$1")
    .replace(/([。！？!?）)])\s+(#{1,6})\s+(?=\S)/g, "$1\n\n$2 ")
    .replace(/^[ \t]+(?=#{1,6}\s)/, "")
    .replace(/\\[ \t]*$/, "  ");
}

function decodeNumericEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : entity;
    })
    .replace(/&#([0-9]+);/g, (entity, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10);
      return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : entity;
    });
}

function isValidCodePoint(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff;
}

function closeUnmatchedStrong(line: string): string {
  const withoutCode = line.replace(/(`+).*?\1/g, "");
  const markerCount = withoutCode.match(/\*\*/g)?.length ?? 0;
  return markerCount % 2 === 1 ? `${line}**` : line;
}
