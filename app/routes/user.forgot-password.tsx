import type { Route } from "./+types/user.forgot-password";
import type { Route as RootRoute } from "../+types/root";
import {
	Form,
	redirect,
	useLocation,
	useNavigation,
	useRouteLoaderData,
	useSearchParams,
} from "react-router";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";

import { LoaderCircle } from "lucide-react";
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
import { EmailSchema as schema } from "~/lib/schemas";

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema });

	if (submission.status !== "success") {
		return submission.reply();
	}

	const user = await prisma.user.findUnique({
		where: {
			email: submission.value.email, // aleady lower-cased
		},
	});

	if (!user) {
		return submission.reply({
			formErrors: ["This email is not registered as a user."],
		});
	}

	if (!user.isVerified) {
		return submission.reply({
			fieldErrors: {
				"verify-email": ["You still need to confirm your email address."],
			},
		});
	} else {
		await sendPasswordResetLink(user);
		return redirect("/user/forgot-password/next-steps");
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	// If there's already a user in the session, redirect to the home page
	const user = await getUser(request);
	if (user) return redirect("/");
	return null;
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
	const location = useLocation();
	const navigation = useNavigation();
	const [searchParams /*, setSearchParams */] = useSearchParams();
	const paramEmail = searchParams.get("email");
	const { org } =
		useRouteLoaderData<RootRoute.ComponentProps["loaderData"]>("root") ?? {};

	const email =
		actionData?.initialValue?.email ||
		location.state?.email ||
		paramEmail ||
		"";

	const [form, fields] = useForm({
		lastResult: actionData,
		constraint: getZodConstraint(schema),
		defaultValue: { email },
		shouldRevalidate: "onInput",
		onValidate({ formData }) {
			return parseWithZod(formData, {
				schema,
			});
		},
	});

	const isSubmitting = navigation.formAction === "/user/sign/in";

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
						Reset your password
					</CardTitle>
					<CardDescription className="text-center text-balance">
						Enter your email address below to reset your password.
					</CardDescription>
				</CardHeader>

				<CardContent className="grid gap-4">
					<Form method="POST" {...getFormProps(form)} className="grid gap-4">
						{form.errors && (
							<div
								id={form.errorId}
								className="w-full font-semibold text-sm text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2"
							>
								{form.errors}
							</div>
						)}

						<FormField
							{...getInputProps(fields.email, { type: "email" })}
							label="Email"
							error={fields.email.errors?.join(", ")}
						/>

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
							Send reset link
						</Button>

						{actionData?.error?.["verify-email"] && (
							<div className="w-full font-semibold text-sm bg-red-500/10 text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2">
								{actionData?.error?.["verify-email"]}
								<Form
									action="/user/verification/resend"
									method="POST"
									className="text-foreground"
								>
									<input
										type="hidden"
										name="email"
										value={actionData.initialValue?.email.toString()}
									/>
									<Button variant="outline" size="sm" type="submit">
										Resend confirmation email
									</Button>
								</Form>
							</div>
						)}
					</Form>
				</CardContent>
			</Card>
			<div className="grow flex flex-row justify-center items-end gap-4 pb-5 text-xs">
				{org?.imprintUrl && (
					<a href={org.imprintUrl} target="_blank" rel="noopener noreferrer">
						Imprint
					</a>
				)}
				{org?.privacyUrl && (
					<a href={org.privacyUrl} target="_blank" rel="noopener noreferrer">
						Privacy
					</a>
				)}
			</div>
		</div>
	);
}
