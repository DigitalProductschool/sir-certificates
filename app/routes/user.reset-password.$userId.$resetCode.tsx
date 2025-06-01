import type {
	ActionFunction,
	LoaderFunction,
	ErrorResponse,
} from "@remix-run/node";
import type { UserPasswordReset } from "@prisma/client";
import type { PasswordAssessment } from "~/components/password-indicator";

import { useState } from "react";
import { redirect, data } from "@remix-run/node";
import {
	Form,
	useActionData,
	useLoaderData,
	useRouteError,
	isRouteErrorResponse,
} from "@remix-run/react";
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

const oneHour = 60 * 60 * 1000;

// Check timestamp of reset code against expiration time
function isTooOld(reset: UserPasswordReset) {
	const oneHourAgo = new Date(Date.now() - oneHour);
	return reset.createdAt < oneHourAgo;
}

export const action: ActionFunction = async ({ request, params }) => {
	const form = await request.formData();
	const password = form.get("password");

	if (typeof password !== "string") {
		return data({ error: `Invalid Form Data` }, { status: 400 });
	}

	const strength = assessPassword(password);
	if (!strength.enough) {
		return data(
			{ error: "Please choose a stronger password." },
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
};

export const loader: LoaderFunction = async ({ params }) => {
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

	const org = await prisma.organisation.findUnique({
		where: {
			id: 1,
		},
	});

	return { org };
};

export default function ResetPassword() {
	const actionData = useActionData<typeof action>();
	const { org } = useLoaderData<typeof loader>();
	const [formData, setFormData] = useState({
		password: "",
	});

	const errors = actionData?.errors || {};
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

			<svg
				className="w-12 h-12"
				width="120"
				height="120"
				viewBox="0 0 120 120"
				fill="currentColor"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M39.9792 71.8087V0.309998H10.0082V71.8087C9.88754 78.7518 11.0948 85.654 13.5649 92.144C15.7741 97.81 19.1859 102.929 23.5651 107.149C28.0804 111.375 33.4587 114.572 39.3289 116.519C45.9974 118.74 52.9908 119.829 60.0189 119.741V92.3115C54.1075 92.2721 49.3061 90.4987 45.6147 86.9912C41.9234 83.4838 40.0448 78.4229 39.9792 71.8087ZM109.931 0.309998H79.9995V67.7594H110L109.931 0.309998ZM106.374 92.4297C104.165 86.7608 100.754 81.6381 96.3742 77.4147C91.8583 73.1915 86.48 69.9982 80.6104 68.0549C73.9424 65.8306 66.949 64.7383 59.9204 64.8234V92.3115C65.8318 92.3115 70.6365 94.0849 74.3344 97.6318C78.0323 101.179 79.8944 106.236 79.9207 112.804V118.164H109.921V112.804C110.074 105.853 108.893 98.9368 106.443 92.4297H106.374Z" />
			</svg>
			<Card className="mx-auto max-w-sm shadow-none border-none bg-transparent">
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
							htmlFor="password"
							label="New password"
							type="password"
							value={formData.password}
							onChange={(e) => handleInputChange(e, "password")}
							error={errors?.password}
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
				{org.imprintUrl && (
					<a
						href={org.imprintUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						Imprint
					</a>
				)}
				{org.privacyUrl && (
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
		errorMessage = routeError.error?.message || routeError.statusText;
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

			<svg
				className="w-12 h-12"
				width="120"
				height="120"
				viewBox="0 0 120 120"
				fill="currentColor"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M39.9792 71.8087V0.309998H10.0082V71.8087C9.88754 78.7518 11.0948 85.654 13.5649 92.144C15.7741 97.81 19.1859 102.929 23.5651 107.149C28.0804 111.375 33.4587 114.572 39.3289 116.519C45.9974 118.74 52.9908 119.829 60.0189 119.741V92.3115C54.1075 92.2721 49.3061 90.4987 45.6147 86.9912C41.9234 83.4838 40.0448 78.4229 39.9792 71.8087ZM109.931 0.309998H79.9995V67.7594H110L109.931 0.309998ZM106.374 92.4297C104.165 86.7608 100.754 81.6381 96.3742 77.4147C91.8583 73.1915 86.48 69.9982 80.6104 68.0549C73.9424 65.8306 66.949 64.7383 59.9204 64.8234V92.3115C65.8318 92.3115 70.6365 94.0849 74.3344 97.6318C78.0323 101.179 79.8944 106.236 79.9207 112.804V118.164H109.921V112.804C110.074 105.853 108.893 98.9368 106.443 92.4297H106.374Z" />
			</svg>
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
