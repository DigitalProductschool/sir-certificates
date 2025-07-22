import type { Route } from "./+types/user.accept-invite.$inviteId.$code";
import type { PasswordAssessment } from "~/components/password-indicator";
import bcrypt from "bcryptjs";
import { useState } from "react";
import { Form, data } from "react-router";
import { Layout } from "~/components/layout";

import {
	PasswordIndicator,
	assessPassword,
} from "~/components/password-indicator";

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
import { getPublicOrg } from "~/lib/organisation.server";

export async function action({ request, params }: Route.ActionArgs) {
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
		const inputs = Object.fromEntries(formData) as { [k: string]: string };

		const strength = assessPassword(inputs.password);
		if (!strength.enough) {
			return data(
				{ error: "Please choose a stronger password." },
				{ status: 400 },
			);
		}

		const passwordHash = await bcrypt.hash(inputs.password, 10);

		// @todo add access control for valid programs of invite sender

		const setAdminOfPrograms = invite.adminOfPrograms
			? invite.adminOfPrograms.map((pId) => ({ id: pId }))
			: [];

		const user = await prisma.user.upsert({
			where: {
				email: invite.email,
			},
			update: {
				isAdmin: invite.isAdmin,
				password: passwordHash,
				adminOfPrograms: { set: setAdminOfPrograms },
			},
			create: {
				firstName: invite.firstName,
				lastName: invite.lastName,
				email: invite.email,
				password: passwordHash,
				verifyCode: invite.verifyCode,
				isAdmin: invite.isAdmin,
				adminOfPrograms: { connect: setAdminOfPrograms },
				isVerified: true,
			},
		});

		if (user) {
			// @todo instead of deleting it, mark it as used and give user feedback when the link is clicked again
			// @todo clean up the used invite codes after a certain time period
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
}

export async function loader({ params }: Route.LoaderArgs) {
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

		const org = await getPublicOrg();
		return { invite, org };
	}

	// Got here?
	throw new Response(null, {
		status: 404,
		statusText: "Invite not found",
	});
}

export default function AcceptInvitationPage({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { invite, org } = loaderData;
	const [password, setPassword] = useState("");

	const formError = actionData?.error;

	let passwordStrength: PasswordAssessment | undefined = undefined;
	let passwordStrengthEnough = false;

	if (password !== "") {
		passwordStrength = assessPassword(password);
		passwordStrengthEnough = passwordStrength.enough;
	}

	return (
		<Layout type="modal">
			<svg
				className="w-12 h-12 grow"
				width="120"
				height="120"
				viewBox="0 0 120 120"
				fill="currentColor"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M39.9792 71.8087V0.309998H10.0082V71.8087C9.88754 78.7518 11.0948 85.654 13.5649 92.144C15.7741 97.81 19.1859 102.929 23.5651 107.149C28.0804 111.375 33.4587 114.572 39.3289 116.519C45.9974 118.74 52.9908 119.829 60.0189 119.741V92.3115C54.1075 92.2721 49.3061 90.4987 45.6147 86.9912C41.9234 83.4838 40.0448 78.4229 39.9792 71.8087ZM109.931 0.309998H79.9995V67.7594H110L109.931 0.309998ZM106.374 92.4297C104.165 86.7608 100.754 81.6381 96.3742 77.4147C91.8583 73.1915 86.48 69.9982 80.6104 68.0549C73.9424 65.8306 66.949 64.7383 59.9204 64.8234V92.3115C65.8318 92.3115 70.6365 94.0849 74.3344 97.6318C78.0323 101.179 79.8944 106.236 79.9207 112.804V118.164H109.921V112.804C110.074 105.853 108.893 98.9368 106.443 92.4297H106.374Z" />
			</svg>

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
						{formError && (
							<div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2">
								{formError}
							</div>
						)}
						<Label>Email</Label>
						<Input disabled defaultValue={invite.email} />
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							onChange={(event) => {
								setPassword(event.target.value);
							}}
						/>
						<Label>
							Password strength
							<PasswordIndicator
								passwordStrength={passwordStrength?.result}
							/>
						</Label>
					</CardContent>
					<CardFooter>
						<Button
							type="submit"
							className="w-full"
							disabled={!passwordStrengthEnough}
						>
							Accept Invite
						</Button>
					</CardFooter>
				</Form>
			</Card>
			<div className="text-xs grow flex flex-row items-end pb-12">
				{org?.name}&emsp;&middot;&emsp;
				<a href={org?.imprintUrl ?? ""}>Imprint</a>&emsp;&middot;&emsp;
				<a href={org?.privacyUrl ?? ""}>Privacy</a>
			</div>
		</Layout>
	);
}
