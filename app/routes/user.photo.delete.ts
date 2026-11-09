import type { Route } from "./+types/user.photo.delete";
import { redirect } from "react-router";
import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { deleteUserPhoto } from "~/lib/user.server";

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request);
	const formData = await request.formData();
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

	// Hand the path to return to over to the photo dialog (works without JS)
	const rawFromPath = formData.get("fromPath");
	if (
		typeof rawFromPath === "string" &&
		rawFromPath.startsWith("/") &&
		!rawFromPath.startsWith("//")
	) {
		const searchParams = new URLSearchParams([["fromPath", rawFromPath]]);
		return redirect(`/user/photo?${searchParams}`);
	}

	return redirect("/user/photo");
}

export async function loader() {
	return redirect(`/user/photo`);
}

// @todo improve user-facing error handling with an ErrorBoundary and a Dialog
