import type { ActionFunction } from "@remix-run/node";
import {
	json,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from "@remix-run/node";

import { requireUserId } from "~/lib/auth.server";
import { saveTransparentPhoto } from "~/lib/user.server";
import { prisma /*, throwErrorResponse */ } from "~/lib/prisma.server";

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
		const userPhoto = await prisma.userPhoto.upsert({
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
		});

		if (userPhoto) {
			// await saveUploadedPhoto(userPhoto, photo);
			const photoBuffer = await photo.arrayBuffer();

			// @todo use Content-Type from uploaded picture instead of hard-coded value
			/* const transPhotoBuffer = await fetch(
				"https://ai-background-removal-f3m36uw7ma-ey.a.run.app/",
				{
					method: "POST",
					cache: "no-cache",
					headers: {
						"Content-Type": photo.type,
						red: "0",
						green: "0",
						blue: "0",
						alpha: "0",
					},
					body: photoBuffer,
				},
			).then((response) => {
				// @todo add error handling, if(response.ok) {}
				return response.arrayBuffer();
			}); */

			await saveTransparentPhoto(userPhoto, photoBuffer);

			return json({ userPhoto });
		}
	} else {
		return new Response(null, {
			status: 400,
			statusText: "Missing uploaded photo",
		});
	}
};
