import type { Route } from "./+types/user.photo.delete";
import { redirect } from "react-router";
import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { deleteUserPhoto } from "~/lib/user.server";

export async function action({ request }: Route.ActionArgs) {
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

	return {};
}

export async function loader() {
	return redirect(`/user/photo`);
}

// @todo improve user-facing error handling with an ErrorBoundary and a Dialog
