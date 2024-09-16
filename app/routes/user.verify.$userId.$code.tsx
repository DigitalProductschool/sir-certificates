import type { LoaderFunction } from "@remix-run/node";

import { redirect } from "@remix-run/node";
import { Layout } from "~/components/layout";
import { prisma } from "~/lib/prisma.server";

export const loader: LoaderFunction = async ({ params }) => {
	if (params.userId && params.code) {
		let user = await prisma.user.findUnique({
			where: {
				id: Number(params.userId),
				verifyCode: params.code,
			},
		});

		if (!user) {
			throw new Response(null, {
				status: 400,
				statusText: "Could not verify the code.",
			});
		}

		if (user) {
			user = await prisma.user.update({
				where: {
					id: user.id,
				},
				data: {
					isVerified: true,
				},
			});

			const searchParams = new URLSearchParams([
				["verification", "done"],
			]);
			throw redirect(`/user/login?${searchParams}`);
		}
	}

	// Got here?
	throw new Response(null, {
		status: 400,
		statusText: "Could not verify the code.",
	});
};

export default function VerifyUserPage() {
	return <Layout type="modal">We did not expect you here.</Layout>;
}
