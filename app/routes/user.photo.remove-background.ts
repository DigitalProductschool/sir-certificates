import type { ActionFunction } from "@remix-run/node";
import {
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from "@remix-run/node";

import { requireUserId } from "~/lib/auth.server";

export const action: ActionFunction = async ({ request }) => {
	await requireUserId(request);

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
		const photoBuffer = await photo.arrayBuffer();

		if (process.env.BACKGROUND_REMOVAL_URL) {
			const transPhotoBuffer = await fetch(
				process.env.BACKGROUND_REMOVAL_URL,
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
			});
			return new Response(transPhotoBuffer, {
				headers: {
					"Content-Type": "image/png",
				},
			});
		} else {
			return new Response(null, {
				status: 500,
				statusText:
					"Missing configuration for background removal tool.",
			});
		}
	} else {
		return new Response(null, {
			status: 400,
			statusText: "Missing uploaded photo",
		});
	}
};
