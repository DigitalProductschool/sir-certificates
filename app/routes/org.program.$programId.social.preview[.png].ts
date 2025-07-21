import type { Route } from "./+types/org.program.$programId.social.preview[.png]";

import { prisma } from "~/lib/prisma.server";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { readBackgroundImage, readCompositeImage } from "~/lib/social.server";

export async function loader({ params, request }: Route.LoaderArgs) {
	await requireAdminWithProgram(request, Number(params.programId));

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
				"Content-Type": "image/png",
			},
		});
	} else {
		const backgroundBuffer = await readBackgroundImage(social);
		if (backgroundBuffer) {
			return new Response(backgroundBuffer, {
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
	}
}
