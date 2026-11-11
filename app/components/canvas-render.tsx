// Client-side rendering of the template content in the canvas editor: loading
// the fonts and measuring text, wrapping and placing text blocks like
// pdf.server.ts does when it draws them into the PDF, and the QR code.
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Typeface } from "~/generated/prisma/client";

let measureContext: CanvasRenderingContext2D | null = null;
function getMeasureContext() {
  if (typeof document === "undefined") return null;
  measureContext ??= document.createElement("canvas").getContext("2d");
  return measureContext;
}

export type Measurer = {
  width: (text: string, font: string, size: number) => number;
  // Distance from the baseline to the top and bottom of the font's line box
  metrics: (font: string, size: number) => { ascent: number; descent: number };
  // CSS font properties of a typeface (its font family is loaded in the browser)
  css: (font: string) => React.CSSProperties;
};

// Loads the fonts of the layout into the browser and returns functions to
// measure and style text with them (in the unit of the size passed in). Until
// a font is loaded, or if it fails to load, text uses a fallback font and an
// average glyph width.
export function useTextMeasurer(
  typefaces: Pick<Typeface, "id" | "name" | "weight" | "style">[],
): Measurer {
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      typefaces.map(async (t) => {
        const face = new FontFace(
          `certiffy-${t.id}`,
          `url(/org/typeface/${t.id}.ttf)`,
          { weight: String(t.weight), style: t.style },
        );
        await face.load();
        document.fonts.add(face);
        return t.name;
      }),
    )
      .then((names) => {
        if (!cancelled) setLoaded(new Set(names));
      })
      .catch((error) => console.error("Could not load fonts", error));
    return () => {
      cancelled = true;
    };
  }, [typefaces]);

  // The canvas context with the font set, or null if it is not available
  const prepare = (font: string, size: number) => {
    const typeface = typefaces.find((t) => t.name === font);
    const context = getMeasureContext();
    if (!context || !typeface || !loaded.has(font)) return null;
    context.font = `${typeface.style} ${typeface.weight} ${size}px "certiffy-${typeface.id}"`;
    return context;
  };

  // A new object when fonts have loaded makes dependents re-measure
  return {
    width: (text, font, size) =>
      prepare(font, size)?.measureText(text).width ?? text.length * size * 0.5,
    metrics: (font, size) => {
      const m = prepare(font, size)?.measureText("x");
      return {
        ascent: m?.fontBoundingBoxAscent ?? size * 0.8,
        descent: m?.fontBoundingBoxDescent ?? size * 0.2,
      };
    },
    css: (font) => {
      const typeface = typefaces.find((t) => t.name === font);
      if (!typeface || !loaded.has(font)) return {};
      return {
        fontFamily: `"certiffy-${typeface.id}"`,
        fontWeight: typeface.weight,
        fontStyle: typeface.style,
      };
    },
  };
}

export type PlacedToken = {
  text: string;
  font: string;
  isSpace: boolean;
  x: number;
  width: number;
};
export type PlacedLine = {
  tokens: PlacedToken[];
  baseline: number;
  width: number;
};

// Wraps and aligns a text block like drawTextBlock in pdf.server.ts does.
// Returns the lines with positions in PDF points (the baseline is measured
// from the page bottom). The optical margin of right-aligned text is ignored.
export function placeTextBlock(
  block: PrismaJson.TextBlock,
  pageWidth: number,
  measurer: Measurer,
): PlacedLine[] {
  const maxWidth = block.maxWidth ?? pageWidth;
  const lineHeight = block.lineHeight ?? block.size * 1.4;

  type Token = Omit<PlacedToken, "x">;
  const visualLines: { tokens: Token[]; width: number }[] = [];
  let current: Token[] = [];
  let currentWidth = 0;

  const pushLine = () => {
    while (current.length && current[current.length - 1].isSpace) {
      currentWidth -= current[current.length - 1].width;
      current.pop();
    }
    if (!current.length) return;
    visualLines.push({ tokens: current, width: currentWidth });
    current = [];
    currentWidth = 0;
  };

  for (const segment of block.lines) {
    for (const text of segment.text.split(/(\s+)/)) {
      if (text === "") continue;
      const isSpace = /^\s+$/.test(text);
      if (!current.length && isSpace) continue;
      const token = {
        text,
        font: segment.font,
        isSpace,
        width: measurer.width(text, segment.font, block.size),
      };
      if (currentWidth + token.width <= maxWidth || !current.length) {
        current.push(token);
        currentWidth += token.width;
      } else {
        pushLine();
        if (!isSpace) {
          current.push(token);
          currentWidth = token.width;
        }
      }
    }
  }
  pushLine();

  return visualLines.map((line, i) => {
    let x = block.x;
    if (block.align === "center") x += (maxWidth - line.width) / 2;
    if (block.align === "right") x += maxWidth - line.width;
    const tokens = line.tokens.map((token) => {
      const placed = { ...token, x };
      x += token.width;
      return placed;
    });
    return { tokens, baseline: block.y - i * lineHeight, width: line.width };
  });
}

// Bounding box of a block in PDF points (top is measured from the page
// bottom), or null if the block has no text. It hugs the text, unless the block
// has a maximum width.
export function textBlockBox(block: PrismaJson.TextBlock, lines: PlacedLine[]) {
  if (lines.length === 0) return null;
  // A defined maximum width is the width of the block, whatever its text
  if (block.maxWidth !== undefined) {
    const top = lines[0].baseline + block.size * 0.8;
    const bottom = lines[lines.length - 1].baseline - block.size * 0.25;
    return { x: block.x, top, width: block.maxWidth, height: top - bottom };
  }
  const left = Math.min(...lines.map((l) => l.tokens[0].x));
  const right = Math.max(...lines.map((l) => l.tokens[0].x + l.width));
  const top = lines[0].baseline + block.size * 0.8;
  const bottom = lines[lines.length - 1].baseline - block.size * 0.25;
  return { x: left, top, width: right - left, height: top - bottom };
}

// A piece of text on a line, at the position where the PDF puts it. The line
// box is as tall as the font's ascent plus descent, which puts the baseline at
// the ascent below the top.
export function TextToken({
  token,
  block,
  baseline,
  pageHeight,
  measurer,
}: {
  token: PlacedToken;
  block: PrismaJson.TextBlock;
  baseline: number;
  pageHeight: number;
  measurer: Measurer;
}) {
  const { ascent, descent } = measurer.metrics(token.font, block.size);
  const [r, g, b] = block.color ?? [0, 0, 0];
  return (
    <span
      className="absolute whitespace-pre"
      style={{
        ...measurer.css(token.font),
        left: token.x,
        top: pageHeight - baseline - ascent,
        fontSize: block.size,
        lineHeight: `${ascent + descent}px`,
        color: `rgb(${r * 255} ${g * 255} ${b * 255})`,
      }}
    >
      {token.text}
    </span>
  );
}

// QR code drawn like drawQRCode in pdf.server.ts: x/y is the bottom left
// corner of the code, with a margin of one module in the background color.
export function QRCodeLayer({
  qrcode,
  url,
  pageHeight,
}: {
  qrcode: PrismaJson.QRCode;
  url: string;
  pageHeight: number;
}) {
  const { modules } = QRCode.create(url, {
    errorCorrectionLevel: qrcode.ec,
  });
  const count = modules.size;
  const moduleSize = qrcode.width / count;
  const rgbString = ([r, g, b]: [number, number, number]) =>
    `rgb(${r * 255} ${g * 255} ${b * 255})`;

  let path = "";
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;
    }
  }

  return (
    <svg
      className="absolute"
      style={{
        left: qrcode.x - moduleSize,
        top: pageHeight - qrcode.y - qrcode.width - moduleSize,
        width: qrcode.width + moduleSize * 2,
        height: qrcode.width + moduleSize * 2,
      }}
      viewBox={`-1 -1 ${count + 2} ${count + 2}`}
      shapeRendering="crispEdges"
    >
      <rect
        x={-1}
        y={-1}
        width={count + 2}
        height={count + 2}
        fill={rgbString(qrcode.background)}
      />
      <path d={path} fill={rgbString(qrcode.color)} />
    </svg>
  );
}
