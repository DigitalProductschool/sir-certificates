import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import { redirect, json } from "@remix-run/node";
import {
	Form,
	Link,
	useActionData,
	useSearchParams,
	useLoaderData,
} from "@remix-run/react";
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
import { useIsMobile } from "~/hooks/use-mobile";
import { login, register, getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
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

	return json({ org });
};

export default function Login() {
	const actionData = useActionData<typeof action>();
	const { org } = useLoaderData<typeof loader>();
	const [searchParams /*, setSearchParams */] = useSearchParams();
	const [isClient, setIsClient] = useState(false);
	const [formAction, setFormAction] = useState("login");
	const [formData, setFormData] = useState({
		email: actionData?.fields?.email || "",
		password: actionData?.fields?.password || "",
		firstName:
			actionData?.fields?.lastName || searchParams.get("firstName") || "",
		lastName:
			actionData?.fields?.firstName || searchParams.get("lastName") || "",
	});

	const isMobile = useIsMobile();

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

	useEffect(() => {
		if (searchParams.get("sign") === "up") {
			setFormAction("register");
		}
		if (searchParams.get("email")) {
			setFormData({
				...formData,
				email: searchParams.get("email"),
			});
		}
	}, [searchParams]);

	useEffect(() => {
		setIsClient(true);
	}, []);

	return (
		<div className="h-screen grid grid-cols-2">
			{!isMobile && (
				<div className="relative h-screen bg-zinc-900">
					{isClient && <Balloons />}
					<div className="absolute top-8 inset-x-8 flex text-white items-center">
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
						&emsp;
						<span className="text-3xl font-bold tracking-wide">
							Certificates
						</span>
					</div>
					<div className="absolute bottom-4 inset-x-8 text-xs text-muted-foreground/50 italic">
						&ldquo;Balloons&rdquo; adapted from{" "}
						<a
							href="https://codesandbox.io/p/sandbox/5w35n6"
							target="_blank"
							rel="noopener noreferrer"
							className="underline"
						>
							Poimandres
						</a>
					</div>
				</div>
			)}
			<div
				className={`h-screen flex flex-col items-center justify-center px-4 dark:bg-black ${isMobile ? "col-span-2" : ""}`}
			>
				{searchParams.get("verification") === "done" && (
					<div className="absolute top-10 flex mx-8 p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
						<CheckIcon /> Email successfully verified. You can now
						sign in.
					</div>
				)}

				<div className="grow"></div>
				{isMobile && (
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
				)}
				<Card className="mx-auto max-w-sm shadow-none border-none bg-transparent">
					<CardHeader>
						<CardTitle className="text-2xl text-center">
							{formAction === "login" ? "Sign In" : "Register"}
						</CardTitle>
						<CardDescription className="text-center text-balance">
							{formAction === "login"
								? "Enter your email and password below to log in to your account and access your certificates."
								: "Enter your name and email and choose a password to register an account and access your certificates."}
						</CardDescription>
					</CardHeader>

					<CardContent className="grid gap-4">
						{formError && (
							<div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2">
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
		</div>
	);
}
