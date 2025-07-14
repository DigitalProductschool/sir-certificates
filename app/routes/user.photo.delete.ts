import type { ActionFunction } from "react-router";
import { redirect } from "react-router";
import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { deleteUserPhoto } from "~/lib/user.server";

export const action: ActionFunction = async ({ request }) => {
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

	await deleteUserPhoto(userPhoto);

	return redirect(`/user/photo`);
};

// @todo improve user-facing error handling with an ErrorBoundary and a Dialog
