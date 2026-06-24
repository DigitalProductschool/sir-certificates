import type { Route } from "./+types/user.accept-invite.$inviteId.$code";
import type { PasswordAssessment } from "~/components/password-indicator";
import bcrypt from "bcryptjs";
import { useState } from "react";
import { Form, Link, data } from "react-router";

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
	CardTitle,
} from "~/components/ui/card";

import { createUserSessionAndRedirect, getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getPublicOrg } from "~/lib/organisation.server";
import { ErrorPublic } from "~/components/error-public";

// Three invite acceptance flows:
// 1. New user — no account yet: show password form, create account on submit.
// 2. Existing user, not logged in: show sign-in button with redirectTo back to this URL.
// 3. Existing user, already logged in as the invited email: show accept button, update permissions only (no password change).

export async function loader({ request, params }: Route.LoaderArgs) {
	if (params.inviteId && params.code) {
		const invite = await prisma.userInvitation.findUnique({
			where: {
				id: Number(params.inviteId),
				verifyCode: params.code,
			},
			select: {
				firstName: true,
				email: true,
				adminOfPrograms: true,
			},
		});

		if (!invite) {
			throw new Response(null, {
				status: 404,
				statusText: "Invite not found or already used.",
			});
		}

		const programs = invite.adminOfPrograms.length
			? await prisma.program.findMany({
					where: { id: { in: invite.adminOfPrograms } },
					select: { id: true, name: true },
				})
			: [];

		const org = await getPublicOrg();
		const currentUser = await getUser(request);

		const invitedExists = !!(await prisma.user.findUnique({
			where: { email: invite.email },
			select: { id: true },
		}));

		const isInvitedUser = !!(
			currentUser && currentUser.email === invite.email
		);

		// @todo add access control for valid programs of invite sender (see action)

		const signInUrl = `/user/sign/in?${new URLSearchParams([
			[
				"redirectTo",
				`/user/accept-invite/${params.inviteId}/${params.code}`,
			],
		])}`;

		return {
			invite,
			org,
			invitedExists,
			isInvitedUser,
			signInUrl,
			programs,
		};
	}

	// else
	throw new Response(null, {
		status: 404,
		statusText: "Invite not found.",
	});
}

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

		// @todo add access control for valid programs of invite sender

		const setAdminOfPrograms = invite.adminOfPrograms
			? invite.adminOfPrograms.map((pId) => ({ id: pId }))
			: [];

		const existingUser = await prisma.user.findUnique({
			where: { email: invite.email },
			select: { id: true },
		});

		if (existingUser) {
			// Security: the logged-in user must be the invited user
			const currentUser = await getUser(request);
			if (!currentUser || currentUser.email !== invite.email) {
				throw new Response(null, {
					status: 403,
					statusText: "Please sign in as the invited user first.",
				});
			}

			const user = await prisma.user.update({
				where: { email: invite.email },
				data: {
					isAdmin: invite.isAdmin,
					adminOfPrograms: { connect: setAdminOfPrograms },
				},
				include: {
					adminOfPrograms: true,
					photo: true,
				},
			});

			// @todo instead of deleting it, mark it as used and give user feedback when the link is clicked again,
			// @todo then clean up the used invite codes after a certain time period
			await prisma.userInvitation.delete({
				where: { id: Number(params.inviteId) },
			});

			return createUserSessionAndRedirect(
				user,
				user.isAdmin ? "/org/program" : "/",
			);
		}

		// New user: require a password
		const formData = await request.formData();
		const inputs = Object.fromEntries(formData) as { [k: string]: string };

		const strength = assessPassword(inputs.password);
		if (!strength.enough) {
			// This is a JSON response, not a HTTP error (doesn't trigger ErrorBoundary)
			return data(
				{ error: "Please choose a stronger password." },
				{ status: 400 },
			);
		}

		const passwordHash = await bcrypt.hash(inputs.password, 10);

		const user = await prisma.user.create({
			data: {
				firstName: invite.firstName,
				lastName: invite.lastName,
				email: invite.email,
				password: passwordHash,
				verifyCode: invite.verifyCode,
				isAdmin: invite.isAdmin,
				adminOfPrograms: { connect: setAdminOfPrograms },
				isVerified: true,
			},
			include: {
				adminOfPrograms: true,
				photo: true,
			},
		});

		await prisma.userInvitation.delete({
			where: { id: Number(params.inviteId) },
		});

		return createUserSessionAndRedirect(
			user,
			user.isAdmin ? "/org/program" : "/",
		);
	}

	throw new Response(null, {
		status: 400,
		statusText: "Could not verify the code.",
	});
}

export default function AcceptInvitationPage({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { invite, org, invitedExists, isInvitedUser, signInUrl, programs } =
		loaderData;
	const [password, setPassword] = useState("");

	const formError = actionData?.error;

	let passwordStrength: PasswordAssessment | undefined = undefined;
	let passwordStrengthEnough = false;

	if (password !== "") {
		passwordStrength = assessPassword(password);
		passwordStrengthEnough = passwordStrength.enough;
	}

	return (
		<div className="h-screen flex flex-col items-center justify-center px-4">
			<div className="grow"></div>
			<img
				src={`/logo/org.svg`}
				alt=""
				className="size-20 dark:invert"
				role="presentation"
			/>

			<Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
				<CardHeader>
					<CardTitle className="text-2xl text-center">
						Accept invitation
					</CardTitle>
					<CardDescription className="text-center text-balance flex flex-col gap-2">
						<p>
							Dear {invite.firstName}, you&apos;ve been invited to
							manage certificates for the following {org.name}{" "}
							programs:{" "}
							{programs
								.map((p) => (
									<strong key={p.id}>{p.name}</strong>
								))
								.join(", ")}
							.
						</p>
						{!invitedExists &&
							"To accept the invitation and complete your registration, please provide a password you would like to use for your account."}
						{/*						{invitedExists &&
							isInvitedUser &&
							"Click below to accept the invitation."} */}
						{invitedExists &&
							!isInvitedUser &&
							"To accept the invitation, please sign into your account first."}
					</CardDescription>
				</CardHeader>

				{!invitedExists && (
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
							<Label>Password strength</Label>
							<PasswordIndicator
								passwordStrength={passwordStrength?.result}
							/>
							<Button
								type="submit"
								className="w-full"
								disabled={!passwordStrengthEnough}
							>
								Accept Invite
							</Button>
						</CardContent>
					</Form>
				)}

				{invitedExists && isInvitedUser && (
					<Form method="POST">
						<CardContent>
							<Button type="submit" className="w-full">
								Accept Invite
							</Button>
						</CardContent>
					</Form>
				)}

				{invitedExists && !isInvitedUser && (
					<CardContent>
						<Button asChild className="w-full">
							<Link to={signInUrl}>Sign in</Link>
						</Button>
					</CardContent>
				)}
			</Card>

			<div className="text-xs grow flex flex-row items-end pb-12">
				{org?.name}&emsp;&middot;&emsp;
				<a href={org?.imprintUrl ?? ""}>Imprint</a>&emsp;&middot;&emsp;
				<a href={org?.privacyUrl ?? ""}>Privacy</a>
			</div>
		</div>
	);
}

export function ErrorBoundary() {
	// @todo ensure a complete layout with app logo, imprint, privacy-disclaimer, etc.
	return (
		<ErrorPublic
			customErrors={{
				404: {
					title: "Invite not found",
					message:
						"This invitation link is invalid or has already been used.",
					detail: "If you believe this is a mistake, ask the sender to invite you again.",
				},
				403: {
					title: "Wrong account",
					message:
						"Please sign in with the email address this invitation was sent to.",
					detail: "",
				},
				400: {
					title: "Invalid invitation",
					message: "This invitation could not be verified.",
					detail: "If you believe this is a mistake, ask the sender to invite you again.",
				},
			}}
		/>
	);
}
