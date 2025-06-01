import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useState } from "react";
import { redirect, data } from "@remix-run/node";
import {
	Form,
	useActionData,
	useSearchParams,
	useLoaderData,
} from "@remix-run/react";
import { FormField } from "~/components/form-field";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { getUser, sendPasswordResetLink } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { validateEmail } from "~/lib/validators.server";

export const action: ActionFunction = async ({ request }) => {
	const form = await request.formData();
	const email = form.get("email");

	if (typeof email !== "string") {
		return data({ error: `Invalid Form Data` }, { status: 400 });
	}

	const errors = {
		email: validateEmail(email),
	};

	if (Object.values(errors).some(Boolean))
		return data(
			{
				errors,
				fields: { email },
			},
			{ status: 400 },
		);

	const user = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (user !== null) {
		await sendPasswordResetLink(user);
	}
	// @todo check if api response timing can be used for user-enumeration attacks
	// https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account

	return redirect("/user/forgot-password/next-steps");
};

export const loader: LoaderFunction = async ({ request }) => {
	// If there's already a user in the session, redirect to the home page
	const user = await getUser(request);
	if (user) return redirect("/");

	const org = await prisma.organisation.findUnique({
		where: { id: 1 },
		select: {
			name: true,
			imprintUrl: true,
			privacyUrl: true,
		},
	});

	return { org };
};

export default function ForgotPassword() {
	const actionData = useActionData<typeof action>();
	const { org } = useLoaderData<typeof loader>();
	const [searchParams /*, setSearchParams */] = useSearchParams();
	const [formData, setFormData] = useState({
		email: actionData?.fields?.email || searchParams.get("email") || "",
	});

	const errors = actionData?.errors || {};
	const formError = actionData?.error;
	const formErrorCode = actionData?.errorCode;

	// Updates the form data when an input changes
	const handleInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
		field: string,
	) => {
		setFormData((form) => ({ ...form, [field]: event.target.value }));
	};

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
						Enter your email address below to reset your password.
					</CardDescription>
				</CardHeader>

				<CardContent className="grid gap-4">
					{formError && (
						<div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center text-center gap-2">
							{formError}
							{formErrorCode &&
								formErrorCode === "verify-email" && (
									<Form
										action="/user/verification/resend"
										method="POST"
									>
										<input
											type="hidden"
											name="email"
											value={formData.email}
										/>
										<Button
											variant="outline"
											size="sm"
											type="submit"
										>
											Resend email
										</Button>
									</Form>
								)}
						</div>
					)}
					<Form method="POST">
						<FormField
							htmlFor="email"
							label="Email"
							value={formData.email}
							onChange={(e) => handleInputChange(e, "email")}
							error={errors?.email}
						/>

						<Button type="submit" className="w-full">
							Send reset link
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
