import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import { redirect, json } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { CheckIcon } from "lucide-react";
import { Balloons } from "~/components/balloons.client";
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
	const [isClient, setIsClient] = useState(false);

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

	useEffect(() => {
		setIsClient(true);
	}, []);

	return (
		<div className="h-screen grid grid-cols-2">
			<div className="relative h-screen bg-zinc-900">
				{isClient && <Balloons />}
				<div className="absolute top-8 inset-x-8 flex text-white items-center">
					<svg
						className="w-12 h-12"
						width="101"
						height="120"
						viewBox="0 0 101 120"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M30.4569 71.8087V0.309998H0.486017V71.8087C0.36532 78.7518 1.57254 85.654 4.04273 92.144C6.25184 97.81 9.66366 102.929 14.0429 107.149C18.5582 111.375 23.9364 114.572 29.8067 116.519C36.4752 118.74 43.4685 119.829 50.4967 119.741V92.3115C44.5852 92.2721 39.7839 90.4987 36.0925 86.9912C32.4011 83.4838 30.5226 78.4229 30.4569 71.8087ZM100.409 0.309998H70.4773V67.7594H100.478L100.409 0.309998ZM96.8521 92.4297C94.6431 86.7608 91.2314 81.6381 86.8519 77.4147C82.336 73.1915 76.9578 69.9982 71.0881 68.0549C64.4202 65.8306 57.4268 64.7383 50.3982 64.8234V92.3115C56.3096 92.3115 61.1143 94.0849 64.8122 97.6318C68.5101 101.179 70.3722 106.236 70.3985 112.804V118.164H100.399V112.804C100.552 105.853 99.371 98.9368 96.9211 92.4297H96.8521Z"
							fill="white"
						/>
					</svg>
					&emsp;
					<span className="text-3xl font-bold tracking-wide">
						Certificates
					</span>
				</div>
			</div>
			<div className="h-screen flex flex-col items-center justify-center px-4 dark:bg-black">
				<Card className="mx-auto max-w-sm shadow-none border-none bg-transparent">
					<CardHeader>
						<CardTitle className="text-2xl text-center">
							{formAction === "login" ? "Sign In" : "Register"}
						</CardTitle>
						<CardDescription className="text-center text-balance">
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
								onChange={(e) =>
									handleInputChange(e, "password")
								}
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
									{formAction === "login"
										? "Sign Up"
										: "Sign In"}
								</Button>
							</div>
						</CardContent>
					</Form>
				</Card>
			</div>
			{searchParams.get("verification") === "done" && (
				<div className="absolute top-8 flex p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
					<CheckIcon /> Email successfully verified. You can now
					login.
				</div>
			)}
		</div>
	);
}
