const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export function prettyPrintHtml(html: string): string {
  const tokens = html
    .trim()
    .replace(/>\s+</g, "><")
    .split(/(<[^>]+>)/)
    .filter((token) => token.trim() !== "");

  let depth = 0;
  const lines: string[] = [];

  for (const token of tokens) {
    const isClosingTag = /^<\/\w/.test(token);
    const isOpeningTag = /^<\w/.test(token) && !isClosingTag;
    const tagName = token.match(/^<\/?(\w+)/)?.[1]?.toLowerCase();
    const isSelfClosing =
      isOpeningTag && (/\/>$/.test(token) || (tagName !== undefined && VOID_ELEMENTS.has(tagName)));

    if (isClosingTag) depth = Math.max(0, depth - 1);

    lines.push("  ".repeat(depth) + token.trim());

    if (isOpeningTag && !isSelfClosing) depth += 1;
  }

  return lines.join("\n");
}
