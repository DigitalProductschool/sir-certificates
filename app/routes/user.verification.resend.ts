import type { ActionFunction } from "react-router";
import { redirect } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { sendVerificationEmail } from "~/lib/user.server";
import { validateEmail } from "~/lib/validators.server";

export const action: ActionFunction = async ({ request }) => {
	const form = await request.formData();
	const email = form.get("email") as string;
	const emailError = validateEmail(email);

	if (emailError) {
		return new Response(null, {
			status: 400,
			statusText: emailError,
		});
	}

	const user = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!user) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	if (user.isVerified) {
		return redirect("/user/sign/in");
	} else {
		await sendVerificationEmail(user);
		return redirect("/user/verification-info");
	}
};
