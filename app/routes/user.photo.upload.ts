import type { ActionFunction } from "@remix-run/node";
import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from "@remix-run/node";

import { requireUserId } from "~/lib/auth.server";
import { saveTransparentPhoto } from "~/lib/user.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request }) => {
	const userId = await requireUserId(request);

	const uploadHandler = unstable_createMemoryUploadHandler({
		maxPartSize: 5 * 1024 * 1024,
		filter: (field) => {
			if (field.name === "photo") {
				if (
					field.contentType === "image/png" ||
					field.contentType === "image/jpeg"
				) {
					return true;
				} else {
					return false;
				}
			} else {
				return true;
			}
		},
	});

	const formData = await unstable_parseMultipartFormData(
		request,
		uploadHandler,
	);

	const photo = formData.get("photo") as File;

	if (photo) {
		const userPhoto = await prisma.userPhoto
			.upsert({
				where: {
					userId,
				},
				update: {
					contentType: photo.type,
				},
				create: {
					contentType: photo.type,
					user: {
						connect: { id: userId },
					},
				},
			})
			.catch((error) => {
				console.error(error);
				throwErrorResponse(error, "Could not create/update user photo");
			});

		if (userPhoto) {
			const photoBuffer = await photo.arrayBuffer();
			await saveTransparentPhoto(userPhoto, photoBuffer);
			return json({ userPhoto: { updatedAt: userPhoto.updatedAt } });
		}
	} else {
		return new Response(null, {
			status: 400,
			statusText: "Missing uploaded photo",
		});
	}
};
