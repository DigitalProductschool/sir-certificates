// Page sizes in whole points (1 pt = 1/72 in), portrait orientation
export const pageSizes = [
  { id: "a3", label: "A3", width: 842, height: 1191 },
  { id: "a4", label: "A4", width: 595, height: 842 },
  { id: "a5", label: "A5", width: 420, height: 595 },
] as const;

export const defaultPageSize = pageSizes[1];

export type PageOrientation = "portrait" | "landscape";

// Matches a page size to a paper preset (in either orientation), with a
// tolerance of 1pt. Returns null for custom sizes.
export function detectPageSize(width: number, height: number) {
  for (const size of pageSizes) {
    const matches = (w: number, h: number) =>
      Math.abs(width - w) <= 1 && Math.abs(height - h) <= 1;
    if (matches(size.width, size.height)) {
      return { ...size, orientation: "portrait" as PageOrientation };
    }
    if (matches(size.height, size.width)) {
      return { ...size, orientation: "landscape" as PageOrientation };
    }
  }
  return null;
}

// kB as whole numbers, MB with one decimal
export function formatBytes(bytes: number) {
  if (bytes >= 1000 * 1000) return `${(bytes / (1000 * 1000)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} kB`;
}
