import type { LoaderFunction } from "react-router";

import { prisma } from "~/lib/prisma.server";
import { generateSocialPreview } from "~/lib/social.server";

export const loader: LoaderFunction = async ({ request, params }) => {
	const certificate = await prisma.certificate.findUnique({
		where: {
			uuid: params.certUuid,
		},
		include: {
			batch: {
				select: {
					programId: true,
				},
			},
		},
	});

	if (!certificate) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const social = await prisma.socialPreview.findUnique({
		where: {
			programId: certificate.batch.programId,
		},
	});

	if (!social) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const user = await prisma.user.findUnique({
		where: {
			email: certificate.email,
		},
		select: {
			id: true,
		},
	});

	const userPhoto = user
		? await prisma.userPhoto.findUnique({
				where: {
					userId: user.id,
				},
			})
		: null;

	const url = new URL(request.url);
	const withPlaceholder = url.searchParams.get("withPlaceholder")
		? true
		: false;

	const imageBuffer = await generateSocialPreview(
		social,
		certificate,
		userPhoto,
		withPlaceholder,
	);

	if (imageBuffer) {
		return new Response(imageBuffer, {
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
};
