import type { Route } from "./+types/user.photo.preview[.png]";

import { prisma } from "~/lib/prisma.server";
import { requireUserId } from "~/lib/auth.server";
import { readPhoto } from "~/lib/user.server";

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request);

	const userPhoto = await prisma.userPhoto.findUnique({
		where: {
			userId,
		},
	});

	if (!userPhoto) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	// @todo support resizing the photo on the fly (i.e. for user icon sizes)?
	const photoBuffer = await readPhoto(userPhoto);
	if (photoBuffer) {
		return new Response(photoBuffer, {
			status: 200,
			headers: {
				"Content-Type": "image/png",
			},
		});
	} else {
		throw new Response(null, {
			status: 404,
			statusText: "File not Found",
		});
	}
}
