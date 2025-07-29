import type { Route } from "./+types/user.forgot-password_.next-steps";
import { redirect } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getUser } from "~/lib/auth.server";
import { getPublicOrg } from "~/lib/organisation.server";

export async function loader({ request }: Route.LoaderArgs) {
	// If there's already a user in the session, redirect to the home page
	const user = await getUser(request);
	if (user) return redirect("/");

	const org = await getPublicOrg();
	return { org };
}

export default function ForgotPasswordNextSteps({
	loaderData,
}: Route.ComponentProps) {
	// @todo use org from root/index
	const { org } = loaderData;

	return (
		<div className="h-screen flex flex-col items-center justify-center px-4 dark:bg-black">
			<div className="grow"></div>

            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-20"
              role="presentation"
            />

			<Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
				<CardHeader>
					<CardTitle className="text-2xl text-center">
						Please check your email inbox.
					</CardTitle>
				</CardHeader>

				<CardContent className="grid gap-4 text-center">
					If the email address you entered is registered here, you
					will receive an email from us with a link to reset your
					password.
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
