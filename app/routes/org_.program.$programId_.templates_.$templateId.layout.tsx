// Canvas-style alternative to the template layout editor (edit-layout).
//
// The trailing underscores in the file name opt this route out of the nested
// layouts (org -> sidebar, program, templates -> toolbar), so the page renders
// full screen. Program access is therefore checked here instead of in the
// parent route. The URL is /org/program/:programId/templates/:templateId/layout
import type { Route } from "./+types/org_.program.$programId_.templates_.$templateId.layout";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  isRouteErrorResponse,
  useFetcher,
  useNavigate,
  useRouteError,
} from "react-router";
import type { Typeface } from "~/generated/prisma/client";
import { ArrowLeft, Minus, Plus, Settings } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getTemplateSampleLayout, sampleQR } from "~/lib/pdf.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `Template ${data?.template?.name}` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const program = await prisma.program.findUnique({
    where: { id: Number(params.programId) },
    select: {
      id: true,
      name: true,
      templates: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
      programId: Number(params.programId),
    },
  });

  if (!program || !template) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  // Same fallback as the classic editor, until all templates have QR settings
  const qrcode = template.qrcode ?? sampleQR;

  // Only the fonts used by the layout are needed to measure the text
  const fontNames = new Set(
    template.layout.flatMap((block) => block.lines.map((line) => line.font)),
  );
  const typefaces = await prisma.typeface.findMany({
    where: { name: { in: [...fontNames] } },
    select: { id: true, name: true, weight: true, style: true },
  });

  // Text with variables replaced by sample data, like in the preview image
  const sampleLayout = getTemplateSampleLayout(template);

  return { program, template, qrcode, typefaces, sampleLayout };
}

// The PDF page size is in points (1/72 inch). Browsers define a CSS inch as
// 96 CSS pixels, independent of the physical pixel density (a retina screen
// has twice the device pixels per CSS pixel, but the same CSS pixels per
// inch), so this is the closest to real paper size we can get.
const CSS_PX_PER_POINT = 96 / 72;
const PAGE_MARGIN = "4rem"; // total horizontal space kept free on small screens
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export default function TemplateCanvasPage({
  loaderData,
}: Route.ComponentProps) {
  const { program, template, qrcode, typefaces, sampleLayout } = loaderData;
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const pageRef = useRef<HTMLDivElement>(null);

  // null = automatic: real paper size, contained to the window width
  const [zoom, setZoom] = useState<number | null>(null);
  // Displayed size relative to the real paper size, measured from the DOM
  const [displayedZoom, setDisplayedZoom] = useState(1);

  const realWidth = template.pageWidth * CSS_PX_PER_POINT;
  const pageWidthCss =
    zoom === null
      ? `min(${realWidth}px, 100vw - ${PAGE_MARGIN})`
      : `${realWidth * zoom}px`;

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const observer = new ResizeObserver(([entry]) => {
      setDisplayedZoom(entry.contentRect.width / realWidth);
    });
    observer.observe(page);
    return () => observer.disconnect();
  }, [realWidth]);

  const measureText = useTextMeasurer(typefaces);

  const changeZoom = (delta: number) => {
    const next = Math.round((displayedZoom + delta) / ZOOM_STEP) * ZOOM_STEP;
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  };

  const templatePath = `/org/program/${program.id}/templates/${template.id}`;

  return (
    <div className="min-h-screen bg-[#fafafa] bg-[url('/assets/canvas-pattern.svg')] bg-[length:48px_48px]">
      {/* Sticky header; transparent, so only the controls cover the canvas */}
      <header className="pointer-events-none sticky top-0 z-20 flex flex-wrap items-center gap-2 p-3 [&>*]:pointer-events-auto">
        <Button
          variant="outline"
          className="h-10 bg-background shadow-xs"
          asChild
        >
          <Link to={`${templatePath}/edit-layout`}>
            <ArrowLeft />
            <span className="max-w-40 truncate">{program.name}</span>
          </Link>
        </Button>

        <div className="ml-2 flex flex-wrap items-center gap-2">
          <Select
            key={template.id}
            defaultValue={String(template.id)}
            onValueChange={(value) =>
              navigate(`/org/program/${program.id}/templates/${value}/layout`)
            }
          >
            <SelectTrigger className="w-[220px] bg-background">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {program.templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="bg-background" asChild>
                <Link
                  to={`${templatePath}/edit-meta`}
                  aria-label="Edit template settings"
                >
                  <Settings />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Edit template settings</TooltipContent>
          </Tooltip>
          <Button variant="outline" className="bg-background" asChild>
            <Link to={`${templatePath}/duplicate`}>Duplicate template</Link>
          </Button>
          <Button variant="outline" className="bg-background" asChild>
            <Link to={`/org/program/${program.id}/templates/create`}>
              Add template
            </Link>
          </Button>
        </div>

        <div className="grow" />

        {/* Saves through the action of the classic editor route */}
        <fetcher.Form method="POST" action={`${templatePath}/edit-layout`}>
          <input
            type="hidden"
            name="layout"
            value={JSON.stringify(template.layout)}
          />
          <input type="hidden" name="qrcode" value={JSON.stringify(qrcode)} />
          <Button type="submit" disabled={fetcher.state !== "idle"}>
            Save
          </Button>
        </fetcher.Form>
      </header>

      {/* Canvas. min-w-full w-max lets the page scroll horizontally when zoomed in */}
      <main className="min-w-full w-max px-8 pb-28 pt-6">
        <div
          ref={pageRef}
          className="relative mx-auto bg-white shadow-xl"
          style={{
            width: pageWidthCss,
            aspectRatio: `${template.pageWidth} / ${template.pageHeight}`,
          }}
        >
          <img
            className="absolute inset-0 size-full select-none"
            draggable={false}
            src={`/org/program/${program.id}/templates/${template.id}/preview.png?t=${template.updatedAt}`}
            alt="Preview of the template"
          />

          {/* Interactive layers. Positions are percentages of the page, so they
              follow the page size at any zoom. PDF coordinates start at the
              bottom left, CSS at the top left. */}
          {sampleLayout.map((block) => {
            const box = textBlockBox(block, template.pageWidth, measureText);
            if (!box) return null;
            return (
              <CanvasElement
                key={block.id}
                label="Text block"
                left={box.x / template.pageWidth}
                top={(template.pageHeight - box.top) / template.pageHeight}
                width={box.width / template.pageWidth}
                height={box.height / template.pageHeight}
              />
            );
          })}
          {qrcode.show && (
            <CanvasElement
              label="QR code"
              left={qrcode.x / template.pageWidth}
              top={
                (template.pageHeight - qrcode.y - qrcode.width) /
                template.pageHeight
              }
              width={qrcode.width / template.pageWidth}
              height={qrcode.width / template.pageHeight}
            />
          )}
        </div>
      </main>

      {/* Zoom control */}
      <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-background p-1 shadow-md">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zoom out"
          disabled={displayedZoom <= MIN_ZOOM}
          onClick={() => changeZoom(-ZOOM_STEP)}
        >
          <Minus />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-16 tabular-nums"
              onClick={() => setZoom(null)}
            >
              {Math.round(displayedZoom * 100)}%
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Real paper size</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zoom in"
          disabled={displayedZoom >= MAX_ZOOM}
          onClick={() => changeZoom(ZOOM_STEP)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

// Hover target for an element on the page; draws a Figma-like bounding box.
// Position and size are fractions (0-1) of the page.
function CanvasElement({
  label,
  left,
  top,
  width,
  height,
}: {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  return (
    <div
      aria-label={label}
      className="absolute rounded-[2px] outline outline-2 outline-offset-4 outline-transparent hover:outline-[#0d99ff]"
      style={{
        left: `${left * 100}%`,
        top: `${top * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      }}
    />
  );
}

let measureContext: CanvasRenderingContext2D | null = null;
function getMeasureContext() {
  if (typeof document === "undefined") return null;
  measureContext ??= document.createElement("canvas").getContext("2d");
  return measureContext;
}

type MeasureText = (text: string, font: string, size: number) => number;

// Loads the fonts of the layout into the browser and returns a function to
// measure text with them (in the unit of the size passed in). Until a font is
// loaded, or if it fails to load, text is measured with an average glyph width.
function useTextMeasurer(
  typefaces: Pick<Typeface, "id" | "name" | "weight" | "style">[],
): MeasureText {
  const [loaded, setLoaded] = useState<Map<string, Typeface["id"]>>(new Map());

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
        return [t.name, t.id] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setLoaded(new Map(entries));
      })
      .catch((error) => console.error("Could not load fonts", error));
    return () => {
      cancelled = true;
    };
  }, [typefaces]);

  // A new function identity when fonts have loaded makes dependents re-measure
  return (text, font, size) => {
    const id = loaded.get(font);
    const typeface = typefaces.find((t) => t.name === font);
    const context = getMeasureContext();
    if (!context || id === undefined || !typeface) {
      return text.length * size * 0.5;
    }
    context.font = `${typeface.style} ${typeface.weight} ${size}px "certiffy-${id}"`;
    return context.measureText(text).width;
  };
}

// Bounding box of the text of a block in PDF points (top is measured from the
// page bottom), or null if the block has no text. Text is wrapped like
// drawTextBlock in pdf.server.ts does.
function textBlockBox(
  block: PrismaJson.TextBlock,
  pageWidth: number,
  measure: MeasureText,
) {
  const maxWidth = block.maxWidth ?? pageWidth;
  const lineHeight = block.lineHeight ?? block.size * 1.4;

  const widths: number[] = [];
  let current = 0;
  let hasContent = false;
  for (const segment of block.lines) {
    for (const token of segment.text.split(/(\s+)/)) {
      if (token === "") continue;
      const isSpace = /^\s+$/.test(token);
      if (!hasContent && isSpace) continue;
      const width = measure(token, segment.font, block.size);
      if (hasContent && current + width > maxWidth) {
        widths.push(current);
        current = 0;
        hasContent = false;
        if (isSpace) continue;
      }
      current += width;
      hasContent = true;
    }
  }
  if (hasContent) widths.push(current);
  if (widths.length === 0) return null;

  const width = Math.min(Math.max(...widths), maxWidth);
  let x = block.x;
  if (block.align === "center") x += (maxWidth - width) / 2;
  if (block.align === "right") x += maxWidth - width;

  // block.y is the baseline of the first line, following lines move downwards
  const top = block.y + block.size * 0.8;
  const bottom = block.y - (widths.length - 1) * lineHeight - block.size * 0.25;
  return { x, top, width, height: top - bottom };
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 px-4">
      <h1>{message}</h1>
      <Button variant="outline" asChild>
        <Link to="/org">Back to admin area</Link>
      </Button>
    </div>
  );
}
