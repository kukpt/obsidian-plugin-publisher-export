/** Ensures raw HTML cannot absorb adjacent Markdown into the same HTML block. */
export function wrapMarkdownBlock(html: string): string {
  return `\n\n${html.trim()}\n\n`;
}
