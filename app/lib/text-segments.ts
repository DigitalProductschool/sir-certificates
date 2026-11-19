// Helpers for the text segments of a text block (each with its own font), by
// character offsets into the whole text of the block.
import { generateRandomId } from "~/lib/utils";

type Segment = PrismaJson.TextSegment;
export type TextRange = { start: number; end: number };

// Text variables like {name} are one unit: never split across segments or
// fonts, and their braces are not punctuation.
function variableSpans(text: string): TextRange[] {
  return [...text.matchAll(/\{[\w.]+\}/g)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

// The range, grown to include every variable it touches
function includeVariables(text: string, range: TextRange): TextRange {
  let { start, end } = range;
  for (const span of variableSpans(text)) {
    if (span.start < range.end && span.end > range.start) {
      start = Math.min(start, span.start);
      end = Math.max(end, span.end);
    }
  }
  return { start, end };
}

const isSpace = (char: string) => /\s/.test(char);
const isWordChar = (char: string | undefined) =>
  char !== undefined && /[\p{L}\p{N}\p{M}_]/u.test(char);

// Words, punctuation and white space are separate runs: punctuation can have a
// different font than the word in front of it. An apostrophe or hyphen between
// two letters belongs to the word.
function charClass(
  text: string,
  i: number,
): "space" | "word" | "punctuation" | "variable" {
  if (isSpace(text[i])) return "space";
  if (variableSpans(text).some((span) => i >= span.start && i < span.end)) {
    return "variable";
  }
  if (isWordChar(text[i])) return "word";
  if (
    "'’-".includes(text[i]) &&
    isWordChar(text[i - 1]) &&
    isWordChar(text[i + 1])
  ) {
    return "word";
  }
  return "punctuation";
}

// The range a font change applies to: the selection, or the word (or
// punctuation) at the cursor: the one before it, or after it at the start of
// the text or of a word. Between words (on white space) it is the character
// before the cursor, so the font of the white space can be chosen too. Empty
// if the block has no text.
export function fontTargetRange(
  lines: Segment[],
  selection: TextRange,
): TextRange {
  const text = lines.map((line) => line.text).join("");
  const start = Math.min(Math.max(selection.start, 0), text.length);
  const end = Math.min(Math.max(selection.end, start), text.length);
  if (end > start) return includeVariables(text, { start, end });
  const anchor =
    start > 0 && !isSpace(text[start - 1])
      ? start - 1
      : start < text.length && !isSpace(text[start])
        ? start
        : null;
  if (anchor !== null) {
    const kind = charClass(text, anchor);
    if (kind === "variable") {
      return variableSpans(text).find(
        (span) => anchor >= span.start && anchor < span.end,
      )!;
    }
    let runStart = anchor;
    while (runStart > 0 && charClass(text, runStart - 1) === kind) runStart--;
    let runEnd = anchor + 1;
    while (runEnd < text.length && charClass(text, runEnd) === kind) runEnd++;
    return { start: runStart, end: runEnd };
  }
  if (start > 0) return { start: start - 1, end: start };
  return { start: 0, end: Math.min(1, text.length) };
}

// The fonts used in a range (more than one if mixed). For an empty range,
// those of all segments.
export function fontsInRange(lines: Segment[], range: TextRange): string[] {
  const fonts = new Set<string>();
  let position = 0;
  for (const line of lines) {
    const from = position;
    position += line.text.length;
    const overlaps = range.start < position && range.end > from;
    if (overlaps || range.start === range.end) fonts.add(line.font);
  }
  return [...fonts];
}

// Sets the font of a range. Segments are split where the range starts or ends
// in them; everything outside the range keeps its font (white space too).
export function setFontInRange(
  lines: Segment[],
  range: TextRange,
  font: string,
): Segment[] {
  if (range.start === range.end)
    return lines.map((line) => ({ ...line, font }));
  range = includeVariables(lines.map((line) => line.text).join(""), range);
  const result: Segment[] = [];
  let position = 0;
  for (const line of lines) {
    const from = position;
    const to = position + line.text.length;
    position = to;
    const a = Math.max(range.start, from);
    const b = Math.min(range.end, to);
    if (a >= b || line.font === font) {
      result.push(line);
      continue;
    }
    const pieces = [
      { from, to: a, font: line.font },
      { from: a, to: b, font },
      { from: b, to, font: line.font },
    ].filter((piece) => piece.to > piece.from);
    pieces.forEach((piece, i) =>
      result.push({
        ...line,
        id: i === 0 ? line.id : generateRandomId(),
        font: piece.font,
        text: line.text.slice(piece.from - from, piece.to - from),
      }),
    );
  }
  return result;
}

// Gives every variable that spans several segments the font of its first
// character, so it is one segment after merging
function withWholeVariables(lines: Segment[]): Segment[] {
  const text = lines.map((line) => line.text).join("");
  return variableSpans(text).reduce((current, span) => {
    let position = 0;
    const owner = current.find((line) => {
      position += line.text.length;
      return position > span.start;
    });
    return owner ? setFontInRange(current, span, owner.font) : current;
  }, lines);
}

// Merges neighbouring segments with the same font into one, and drops empty
// ones. The text stays exactly the same, white space included.
export function mergeSegments(input: Segment[]): Segment[] {
  const lines = withWholeVariables(input);
  const filled = lines.filter((line) => line.text !== "");
  if (filled.length === 0) return lines.slice(0, 1);
  const result: Segment[] = [];
  for (const line of filled) {
    const last = result[result.length - 1];
    if (last && last.font === line.font) {
      result[result.length - 1] = { ...last, text: last.text + line.text };
    } else {
      result.push(line);
    }
  }
  return result;
}
