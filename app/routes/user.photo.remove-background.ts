import type { ActionFunction } from "react-router";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { type LazyContent, LazyFile } from "@mjackson/lazy-file";

import { requireUserId } from "~/lib/auth.server";

export const action: ActionFunction = async ({ request }) => {
	await requireUserId(request);

	const uploadHandler = async (fileUpload: FileUpload) => {
		if (
			fileUpload.fieldName === "photo" &&
			(fileUpload.type === "image/png" ||
				fileUpload.type === "image/jpeg")
		) {
			if (process.env.BACKGROUND_REMOVAL_URL === undefined) {
				throw new Response(null, {
					status: 500,
					statusText:
						"Missing configuration for background removal tool.",
				});
			}

			const response = await fetch(process.env.BACKGROUND_REMOVAL_URL, {
				method: "POST",
				cache: "no-cache",
				headers: {
					"Content-Type": fileUpload.type,
					red: "0",
					green: "0",
					blue: "0",
					alpha: "0",
				},
				body: fileUpload.stream(),
				// @ts-expect-error duplex option is not defined in the RequestInit type, but necessary to avoid a runtime exception
				duplex: "half",
			});

			if (!response.ok) {
				throw new Response(null, {
					status: 500,
					statusText:
						"No response from the background removal process.",
				});
			}

			const contentLength = Number(
				response.headers.get("content-length"),
			);

			if (contentLength > 0) {
				// Streaming response back to client
				const transparentContent: LazyContent = {
					byteLength: contentLength,
					stream() {
						return response.body !== null
							? response.body
							: new ReadableStream();
					},
				};

				return new LazyFile(transparentContent, "transparent.png", {
					type: "image/png",
				});
			} else {
				// If content-length is not set, we cannot stream and have to buffer the file first.
				const buffer = await response.arrayBuffer();
				return new File([buffer], "transparent.png", {
					type: "image/png",
				});
			}

			/*  */
		}
	};

	// @todo handle MaxFilesExceededError, MaxFileSizeExceededError in a try...catch block (see example https://www.npmjs.com/package/@mjackson/form-data-parser) when https://github.com/mjackson/remix-the-web/issues/60 is resolved
	const formData = await parseFormData(
		request,
		{ maxFiles: 1, maxFileSize: 5 * 1024 * 1024 },
		uploadHandler,
	);

	// @todo at this stage the file does get fully buffered into memory, instead of streaming the response back.
	// @todo if we refactor the POST request to send raw binary instead of form/multipart, maybe we can avoid the form parsing and stream everything all the way through
	const photo = formData.get("photo") as File;

	if (photo) {
		const photoBuffer = await photo.arrayBuffer();
		return new Response(photoBuffer, {
			headers: {
				"Content-Type": "image/png",
			},
		});
	} else {
		return new Response(null, {
			status: 400,
			statusText: "Missing uploaded photo",
		});
	}
};
