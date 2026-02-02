import type { Route } from "./+types/user.reset-password.$userId.$resetCode";
import type { ErrorResponse } from "react-router";
import type { UserPasswordReset } from "~/generated/prisma/client";
import type { PasswordAssessment } from "~/components/password-indicator";

import { useState } from "react";
import {
	Form,
	data,
	redirect,
	useRouteError,
	isRouteErrorResponse,
} from "react-router";
import { FormField } from "~/components/form-field";
import {
	PasswordIndicator,
	assessPassword,
} from "~/components/password-indicator";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { prisma } from "~/lib/prisma.server";
import { changePassword } from "~/lib/user.server";
import { getPublicOrg } from "~/lib/organisation.server";

const oneHour = 60 * 60 * 1000;

// Check timestamp of reset code against expiration time
function isTooOld(reset: UserPasswordReset) {
	const oneHourAgo = new Date(Date.now() - oneHour);
	return reset.createdAt < oneHourAgo;
}

export async function action({ request, params }: Route.ActionArgs) {
	const form = await request.formData();
	const password = form.get("password");

	if (typeof password !== "string") {
		return data(
			{ error: `Invalid Form Data`, errors: { password: undefined } },
			{ status: 400 },
		);
	}

	const strength = assessPassword(password);
	if (!strength.enough) {
		return data(
			{
				error: "Please choose a stronger password.",
				errors: { password: undefined },
			},
			{ status: 400 },
		);
	}

	if (!params.resetCode) {
		throw new Response(null, {
			status: 400,
			statusText: "Missing reset code.",
		});
	}

	const reset = await prisma.userPasswordReset.findUnique({
		where: {
			resetCode: params.resetCode,
		},
		include: {
			user: true,
		},
	});

	if (!reset) {
		throw new Response(null, {
			status: 404,
			statusText: "Password reset request not found.",
		});
	}

	if (isTooOld(reset)) {
		// @todo this could be improved by redirecting to /user/forgot-password and showing the error message there
		throw new Response(null, {
			status: 403,
			statusText:
				"This reset link has expired. Please request a new link.",
		});
	}

	await changePassword(reset.user, password);

	await prisma.userPasswordReset.delete({
		where: {
			id: reset.id,
		},
	});

	const searchParams = new URLSearchParams([["reset", "done"]]);
	return redirect(`/user/sign/in?${searchParams}`);
}

export async function loader({ params }: Route.LoaderArgs) {
	if (!params.userId) {
		throw new Response(null, {
			status: 400,
			statusText: "Missing user id",
		});
	}
	if (!params.resetCode) {
		throw new Response(null, {
			status: 400,
			statusText: "Missing reset code",
		});
	}

	const reset = await prisma.userPasswordReset.findUnique({
		where: {
			userId: Number(params.userId),
			resetCode: params.resetCode,
		},
	});

	if (!reset) {
		throw new Response(null, {
			status: 404,
			statusText: "Password reset request not found",
		});
	}

	if (isTooOld(reset)) {
		// @todo this could be improved by redirecting to /user/forgot-password and showing the error message there
		throw new Response(null, {
			status: 403,
			statusText:
				"This reset link has expired. Please request a new link.",
		});
	}

	const org = await getPublicOrg();
	return { org };
}

export default function ResetPassword({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { org } = loaderData;
	const [formData, setFormData] = useState({
		password: "",
	});

	const formError = actionData?.error;

	// Updates the form data when an input changes
	const handleInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
		field: string,
	) => {
		setFormData((form) => ({ ...form, [field]: event.target.value }));
	};

	let passwordStrength: PasswordAssessment | undefined = undefined;
	let passwordStrengthEnough = false;

	if (formData.password !== "") {
		passwordStrength = assessPassword(formData.password);
		passwordStrengthEnough = passwordStrength.enough;
	}

	return (
		<div className="h-screen flex flex-col items-center justify-center px-4 dark:bg-black">
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
						Reset your password
					</CardTitle>
					<CardDescription className="text-center text-balance">
						Please enter a new password you want to use to access
						your account.
					</CardDescription>
				</CardHeader>

				<CardContent className="grid gap-4">
					{formError && (
						<div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center text-center gap-2">
							{formError}
						</div>
					)}
					<Form method="POST" className="flex flex-col gap-4">
						<FormField
							id="password"
							name="password"
							label="New password"
							type="password"
							value={formData.password}
							onChange={(e) => handleInputChange(e, "password")}
							error={actionData?.errors?.password}
						/>

						<Label>
							Password strength
							<PasswordIndicator
								passwordStrength={passwordStrength?.result}
							/>
						</Label>

						<Button
							type="submit"
							className="w-full"
							disabled={!passwordStrengthEnough}
						>
							Reset password
						</Button>
					</Form>
				</CardContent>
			</Card>
			<div className="grow flex flex-row justify-center items-end gap-4 pb-5 text-xs">
				{org?.imprintUrl && (
					<a
						href={org.imprintUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Imprint
					</a>
				)}
				{org?.privacyUrl && (
					<a
						href={org.privacyUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Privacy
					</a>
				)}
			</div>
		</div>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();
	let errorMessage: string;

	if (isRouteErrorResponse(error)) {
		// error is type `ErrorResponse`
		const routeError = error as ErrorResponse;
		errorMessage = routeError.data?.error?.message || routeError.statusText;
	} else if (error instanceof Error) {
		errorMessage = error.message;
	} else if (typeof error === "string") {
		errorMessage = error;
	} else {
		console.error(error);
		errorMessage = "Unknown error";
	}

	return (
		<div className="h-screen flex flex-col items-center justify-center px-4 dark:bg-black">
			<div className="grow"></div>

			<img
				src={`/logo/org.svg`}
				alt=""
				className="size-12"
				role="presentation"
			/>

			<Card className="mx-auto max-w-sm shadow-none border-none bg-transparent">
				<CardHeader>
					<CardTitle className="text-2xl text-center">
						Reset your password
					</CardTitle>
				</CardHeader>

				<CardContent className="grid gap-4 text-balance">
					<div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center text-center gap-2">
						{errorMessage}
					</div>
				</CardContent>
			</Card>
			<div className="grow flex flex-row justify-center items-end gap-4 pb-5 text-xs"></div>
		</div>
	);
}
