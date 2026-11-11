import type { Route } from "./+types/org.typeface.$typefaceId[.ttf]";

import { requireAdmin } from "~/lib/auth.server";
import { readFontFile } from "~/lib/typeface.server";

// Serves the font file to admins, e.g. for measuring text in the layout editor
export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);

  const font = await readFontFile(Number(params.typefaceId));
  if (!font) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  return new Response(new Uint8Array(font), {
    status: 200,
    headers: {
      "Content-Type": "font/ttf",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
