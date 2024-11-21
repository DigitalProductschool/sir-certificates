import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import bcrypt from "bcryptjs";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Layout } from "~/components/layout";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardFooter,
	CardTitle,
} from "~/components/ui/card";

import { createUserSessionAndRedirect } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request, params }) => {
	if (params.inviteId && params.code) {
		const invite = await prisma.userInvitation.findUnique({
			where: {
				id: Number(params.inviteId),
				verifyCode: params.code,
			},
		});

		if (!invite) {
			throw new Response(null, {
				status: 400,
				statusText: "Could not verify the code.",
			});
		}

		const formData = await request.formData();
		const inputs = Object.fromEntries(formData);

		const passwordHash = await bcrypt.hash(inputs.password, 10);

		const user = await prisma.user.upsert({
			where: {
				email: invite.email,
			},
			update: {
				isAdmin: invite.isAdmin,
				password: passwordHash,
			},
			create: {
				firstName: invite.firstName,
				lastName: invite.lastName,
				email: invite.email,
				password: passwordHash,
				verifyCode: invite.verifyCode,
				isAdmin: invite.isAdmin,
			},
		});

		if (user) {
			// clean up the used invite code
			await prisma.userInvitation.delete({
				where: {
					id: Number(params.inviteId),
				},
			});
		}

		return createUserSessionAndRedirect(
			user,
			user.isAdmin ? "/org/program" : "/",
		);
	}

	// Got here?
	throw new Response(null, {
		status: 400,
		statusText: "Could not verify the code.",
	});
};

export const loader: LoaderFunction = async ({ params }) => {
	if (params.inviteId && params.code) {
		const invite = await prisma.userInvitation.findUnique({
			where: {
				id: Number(params.inviteId),
				verifyCode: params.code,
			},
			select: {
				email: true,
			},
		});

		if (!invite) {
			throw new Response(null, {
				status: 404,
				statusText: "Invite not found",
			});
		}

		return json({ invite });
	}

	// Got here?
	throw new Response(null, {
		status: 404,
		statusText: "Invite not found",
	});
};

export default function AcceptInvitationPage() {
	const { invite } = useLoaderData<typeof loader>();

	return (
		<Layout type="modal">
			<Card className="mx-auto max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">
						Accept invitation
					</CardTitle>
					<CardDescription>
						To accept the invitation and complete your registration,
						please provide a password you would like to use for your
						account.
					</CardDescription>
				</CardHeader>

				<Form method="POST">
					<CardContent className="grid gap-4">
						<Label>Email</Label>
						<Input disabled defaultValue={invite.email} />
						<Label htmlFor="password">Password</Label>
						<Input id="password" name="password" type="password" />
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full">
							Accept Invite
						</Button>
					</CardFooter>
				</Form>
			</Card>
		</Layout>
	);
}
