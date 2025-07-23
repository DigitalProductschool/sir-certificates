import type { Route } from "./+types/user.forgot-password";
import { useState } from "react";
import { Form, data, redirect, useSearchParams } from "react-router";
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
import { getPublicOrg } from "~/lib/organisation.server";
import { prisma } from "~/lib/prisma.server";
import { validateEmail } from "~/lib/validators.server";

export async function action({ request }: Route.ActionArgs) {
	const form = await request.formData();
	const email = form.get("email");

	if (typeof email !== "string") {
		return data(
			{
				error: `Invalid Form Data`,
				errors: { email: undefined },
				fields: { email: undefined },
				errorCode: "",
			},
			{ status: 400 },
		);
	}

	const errors = {
		email: validateEmail(email),
	};

	if (Object.values(errors).some(Boolean))
		return data(
			{
				error: "",
				errors,
				fields: { email },
				errorCode: "",
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
}

export async function loader({ request }: Route.LoaderArgs) {
	// If there's already a user in the session, redirect to the home page
	const user = await getUser(request);
	if (user) return redirect("/");

	const org = await getPublicOrg();
	return { org };
}

export default function ForgotPassword({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { org } = loaderData;
	const [searchParams /*, setSearchParams */] = useSearchParams();
	const [formData, setFormData] = useState({
		email: actionData?.fields?.email || searchParams.get("email") || "",
	});

	const errors = actionData?.errors || { email: "" };
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

            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-12"
              role="presentation"
            />

			<Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
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
