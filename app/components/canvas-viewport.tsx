// The viewport of the canvas editor: panning and zooming (the state in the
// useCanvasView hook, applied by the CanvasViewport component). The page is
// laid out at its real size and moved/scaled with a transform, so zooming and
// panning animate as one movement.
import { useEffect, useRef, useState } from "react";

// The PDF page size is in points (1/72 inch). Browsers define a CSS inch as
// 96 CSS pixels, independent of the physical pixel density (a retina screen
// has twice the device pixels per CSS pixel, but the same CSS pixels per
// inch), so this is the closest to real paper size we can get.
export const CSS_PX_PER_POINT = 96 / 72;
const PAGE_MARGIN = 64; // total horizontal space kept free when fitting the page
const TOP_SPACE = 88; // space above the page for the sticky header
const KEEP_VISIBLE = 120; // px of the page that stay on screen when panning
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.25;

// Mouse cursor of the add text tool: a crosshair (the hot spot, where the text
// starts) with a T next to it
const ADD_TEXT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke-linecap="round"><path d="M8 2v12M2 8h12M15 14h10M20 14v11" stroke="white" stroke-width="3.5"/><path d="M8 2v12M2 8h12M15 14h10M20 14v11" stroke="black" stroke-width="1.5"/></svg>',
)}") 8 8, crosshair`;

// Active tool: select and drag, or click on the page to add a text block
export type CanvasTool = "select" | "text";

// Position of the page's top left corner in the viewport (px) and its scale
// relative to the real paper size
type View = { zoom: number; x: number; y: number };

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type CanvasView = ReturnType<typeof useCanvasView>;

export function useCanvasView(pageWidth: number, pageHeight: number) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(
    null,
  );
  // null = automatic: real paper size, contained to the window width. Set as
  // soon as the user zooms or pans.
  const [manualView, setManualView] = useState<View | null>(null);
  // Animate zoom changes by the buttons, but not dragging or wheel zooming
  const [animate, setAnimate] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; view: View } | null>(null);

  const realWidth = pageWidth * CSS_PX_PER_POINT;
  const realHeight = pageHeight * CSS_PX_PER_POINT;

  let autoView: View | null = null;
  if (viewport) {
    const zoom = clamp((viewport.w - PAGE_MARGIN) / realWidth, MIN_ZOOM, 1);
    autoView = { zoom, x: (viewport.w - realWidth * zoom) / 2, y: TOP_SPACE };
  }
  const view = manualView ?? autoView;

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keeps part of the page on screen, but allows it to move beyond the edges
  const commitView = (next: View, animated: boolean) => {
    if (!viewport) return;
    const w = realWidth * next.zoom;
    const h = realHeight * next.zoom;
    setAnimate(animated);
    setManualView({
      zoom: next.zoom,
      x: clamp(next.x, KEEP_VISIBLE - w, viewport.w - KEEP_VISIBLE),
      y: clamp(next.y, KEEP_VISIBLE - h, viewport.h - KEEP_VISIBLE),
    });
  };

  // Zooms so that the page point under (cx, cy) stays where it is
  const zoomAt = (
    from: View,
    zoom: number,
    cx: number,
    cy: number,
    animated: boolean,
  ) => {
    const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    commitView(
      {
        zoom: z,
        x: cx - ((cx - from.x) / from.zoom) * z,
        y: cy - ((cy - from.y) / from.zoom) * z,
      },
      animated,
    );
  };

  const stepZoom = (delta: number) => {
    if (!view || !viewport) return;
    const next = Math.round((view.zoom + delta) / ZOOM_STEP) * ZOOM_STEP;
    zoomAt(view, next, viewport.w / 2, viewport.h / 2, true);
  };

  // Back to the automatic view
  const fitToWindow = () => {
    setAnimate(true);
    setManualView(null);
  };

  // Wheel / trackpad: pan, or zoom around the cursor with ctrl/cmd (also
  // pinch gestures). A native listener is needed to be allowed to prevent the
  // browser's own page zoom.
  const wheelHandler = useRef<(e: WheelEvent) => void>(undefined);
  useEffect(() => {
    wheelHandler.current = (e) => {
      if (!view) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(
          view,
          view.zoom * Math.exp(-e.deltaY * 0.01),
          e.clientX,
          e.clientY,
          false,
        );
      } else {
        commitView(
          { ...view, x: view.x - e.deltaX, y: view.y - e.deltaY },
          false,
        );
      }
    };
  });
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const listener = (e: WheelEvent) => wheelHandler.current?.(e);
    element.addEventListener("wheel", listener, { passive: false });
    return () => element.removeEventListener("wheel", listener);
  }, []);

  // Dragging the canvas, except from interactive elements (data-no-pan).
  // Returns whether dragging started.
  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!view || e.button !== 0) return false;
    if ((e.target as Element).closest("[data-no-pan]")) return false;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, view };
    setDragging(true);
    return true;
  };
  const movePan = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start) return;
    commitView(
      {
        ...start.view,
        x: start.view.x + e.clientX - start.x,
        y: start.view.y + e.clientY - start.y,
      },
      false,
    );
  };
  const endPan = () => {
    dragStart.current = null;
    setDragging(false);
  };

  return {
    viewportRef,
    view,
    realWidth,
    realHeight,
    // Screen pixels per point of the page
    pixelsPerPoint: (view?.zoom ?? 1) * CSS_PX_PER_POINT,
    animate,
    endAnimation: () => setAnimate(false),
    dragging,
    stepZoom,
    fitToWindow,
    startPan,
    movePan,
    endPan,
  };
}

// The pattern background with the page on it. The children are the content of
// the page (in screen pixels at 100% zoom).
export function CanvasViewport({
  canvas,
  tool,
  onClick,
  onPointerDown,
  children,
}: {
  canvas: CanvasView;
  tool: CanvasTool;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  const { viewportRef, view, animate, dragging, realWidth, realHeight } =
    canvas;
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the text tool needs a pointer; adding text by keyboard comes later */}
      <div
        ref={viewportRef}
        className={`absolute inset-0 touch-none select-none bg-[url('/assets/canvas-pattern.svg')] bg-[length:48px_48px] ${tool === "text" ? "" : dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          cursor: tool === "text" ? ADD_TEXT_CURSOR : undefined,
          backgroundPosition: view ? `${view.x}px ${view.y}px` : undefined,
        }}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => canvas.movePan(e)}
        onPointerUp={() => canvas.endPan()}
        onPointerCancel={() => canvas.endPan()}
      >
        <div
          className={`absolute left-0 top-0 origin-top-left bg-white shadow-xl ${animate ? "transition-transform duration-200 ease-out motion-reduce:transition-none" : ""}`}
          onTransitionEnd={() => canvas.endAnimation()}
          style={
            {
              width: realWidth,
              height: realHeight,
              visibility: view ? "visible" : "hidden",
              transform: view
                ? `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`
                : undefined,
              // Lets interface details keep their on-screen size when zoomed
              "--ui-scale": view ? 1 / view.zoom : 1,
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </div>
    </>
  );
}
