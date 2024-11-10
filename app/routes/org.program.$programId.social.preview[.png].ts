import type { LoaderFunction } from "@remix-run/node";

import { prisma } from "~/lib/prisma.server";
import { requireAdmin } from "~/lib/auth.server";
import { readCompositeImage } from "~/lib/social.server";

export const loader: LoaderFunction = async ({ request, params }) => {
	await requireAdmin(request);

	const url = new URL(request.url);
	const withPhoto = url.searchParams.get("withPhoto") ? true : false;

	const social = await prisma.socialPreview.findUnique({
		where: {
			programId: Number(params.programId),
		},
	});

	if (!social) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const imageBuffer = await readCompositeImage(social, withPhoto);
	if (imageBuffer) {
		return new Response(imageBuffer, {
			status: 200,
			headers: {
				"Content-Type": social.contentType,
			},
		});
	} else {
		throw new Response(null, {
			status: 404,
			statusText: "File not Found",
		});
	}
};
