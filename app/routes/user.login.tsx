import type { ActionFunction, LoaderFunction } from "@remix-run/node";

import { redirect, json } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Layout } from "~/components/layout";
import { FormField } from "~/components/form-field";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { login, register, getUser } from "~/lib/auth.server";
import {
	validateEmail,
	validateName,
	validatePassword,
} from "~/lib/validators.server";

export const action: ActionFunction = async ({ request }) => {
	const form = await request.formData();
	const formAction = form.get("_action");
	const email = form.get("email");
	const password = form.get("password");
	let firstName = form.get("firstName");
	let lastName = form.get("lastName");

	if (
		typeof formAction !== "string" ||
		typeof email !== "string" ||
		typeof password !== "string"
	) {
		return json(
			{ error: `Invalid Form Data`, form: formAction },
			{ status: 400 },
		);
	}

	if (
		formAction === "register" &&
		(typeof firstName !== "string" || typeof lastName !== "string")
	) {
		return json(
			{ error: `Invalid Form Data`, form: formAction },
			{ status: 400 },
		);
	}

	const errors = {
		email: validateEmail(email),
		password: validatePassword(password),
		...(formAction === "register"
			? {
					firstName: validateName((firstName as string) || ""),
					lastName: validateName((lastName as string) || ""),
				}
			: {}),
	};

	if (Object.values(errors).some(Boolean))
		return json(
			{
				errors,
				fields: { email, password, firstName, lastName },
				form: formAction,
			},
			{ status: 400 },
		);

	switch (formAction) {
		case "login": {
			return await login({ email, password });
		}
		case "register": {
			firstName = firstName as string;
			lastName = lastName as string;
			return await register({ email, password, firstName, lastName });
		}
		default:
			return json({ error: `Invalid Form Data` }, { status: 400 });
	}
};

export const loader: LoaderFunction = async ({ request }) => {
	// If there's already a user in the session, redirect to the home page
	return (await getUser(request)) ? redirect("/") : null;
};

export default function Login() {
	const actionData = useActionData<typeof action>();
	const [searchParams /*, setSearchParams */] = useSearchParams();

	const [formAction, setFormAction] = useState("login");
	const [formData, setFormData] = useState({
		email: actionData?.fields?.email || "",
		password: actionData?.fields?.password || "",
		firstName: actionData?.fields?.lastName || "",
		lastName: actionData?.fields?.firstName || "",
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

	return (
		<Layout type="modal">
			<Card className="mx-auto max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">
						{" "}
						{formAction === "login" ? "Login" : "Register"}
					</CardTitle>
					<CardDescription>
						{formAction === "login"
							? "Enter your email and password below to log in to your account"
							: "Enter your name and email and choose a password to register an account"}
					</CardDescription>
				</CardHeader>

				<Form method="POST">
					<CardContent className="grid gap-4">
						<div className="text-xs font-semibold text-center tracking-wide text-red-500 w-full">
							{formError}
						</div>
						<FormField
							htmlFor="email"
							label="Email"
							value={formData.email}
							onChange={(e) => handleInputChange(e, "email")}
							error={errors?.email}
						/>
						<FormField
							htmlFor="password"
							type="password"
							label="Password"
							value={formData.password}
							onChange={(e) => handleInputChange(e, "password")}
							error={errors?.password}
							hint={
								formAction === "login" && (
									<Link
										to="#"
										className="ml-auto inline-block text-sm underline"
									>
										Forgot your password?
									</Link>
								)
							}
						/>
						{formAction === "register" && (
							<>
								<FormField
									htmlFor="firstName"
									label="First Name"
									onChange={(e) =>
										handleInputChange(e, "firstName")
									}
									value={formData.firstName}
									error={errors?.firstName}
								/>
								<FormField
									htmlFor="lastName"
									label="Last Name"
									onChange={(e) =>
										handleInputChange(e, "lastName")
									}
									value={formData.lastName}
									error={errors?.lastName}
								/>
							</>
						)}

						<Button
							type="submit"
							name="_action"
							value={formAction}
							className="w-full"
						>
							{formAction === "login" ? "Sign In" : "Sign Up"}
						</Button>

						<div className="mt-4 text-center text-sm">
							{formAction === "login"
								? "Don't have an account?"
								: "Already got an account?"}

							<Button
								type="button"
								variant="link"
								onClick={() =>
									setFormAction(
										formAction == "login"
											? "register"
											: "login",
									)
								}
								className="underline"
							>
								{formAction === "login" ? "Sign Up" : "Sign In"}
							</Button>
						</div>
					</CardContent>
				</Form>
			</Card>
			{searchParams.get("verification") === "done" && (
				<div className="absolute top-8 flex p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
					<CheckIcon /> Email successfully verified. You can now
					login.
				</div>
			)}
		</Layout>
	);
}
