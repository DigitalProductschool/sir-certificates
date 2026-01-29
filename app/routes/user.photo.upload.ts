import type { Route } from "./+types/user.photo.upload";
import type { UserPhoto } from "~/generated/prisma/client";
import { redirect } from "react-router";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { requireUserId } from "~/lib/auth.server";
import { saveTransparentPhotoUpload } from "~/lib/user.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request);
	let userPhoto: UserPhoto | void = undefined;

	const uploadHandler = async (fileUpload: FileUpload) => {
		if (
			fileUpload.fieldName === "photo" &&
			fileUpload.type === "image/png"
		) {
			userPhoto = await prisma.userPhoto
				.upsert({
					where: {
						userId,
					},
					update: {
						contentType: fileUpload.type,
					},
					create: {
						contentType: fileUpload.type,
						user: {
							connect: { id: userId },
						},
					},
				})
				.catch((error) => {
					console.error(error);
					throwErrorResponse(
						error,
						"Could not create/update user photo",
					);
				});

			if (userPhoto) {
				return await saveTransparentPhotoUpload(userPhoto, fileUpload);
			}
		}
	};

	// @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
	const formData = await parseFormData(
		request,
		{ maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
		uploadHandler,
	);

	const photo = formData.get("photo") as File;

	if (!photo) {
		return new Response(null, {
			status: 400,
			statusText: "Missing uploaded photo",
		});
	}

	return { userPhoto };
}

export async function loader() {  
	return redirect(`/user/photo`);
}
