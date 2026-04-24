import type { Route } from "./+types/user.verification-info";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { getPublicOrg } from "~/lib/organisation.server";

import { MailIcon } from "lucide-react"

export async function loader() {
	const org = await getPublicOrg();
	return { org };
}

export default function VerificationInfoPage({
	loaderData,
}: Route.ComponentProps) {
	const { org } = loaderData;
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
						Thank you for signing up to {org?.name} Certificates.
					</CardTitle>
					<CardDescription className=" text-center">
						Please verify your email to activate your account.
					</CardDescription>
				</CardHeader>

				<CardContent className="text-center text-balance">
					Before you can get started, we need to <b>verify your email
					address</b>. Please check your inbox and click on the link we
					just sent you.

					<div className="flex justify-center p-6"><MailIcon className="size-10" /></div>
				</CardContent>
			</Card>
			<div className="text-xs grow flex flex-row items-end pb-12">
				{org?.name}&emsp;&middot;&emsp;
				<a href={org?.imprintUrl ?? ""}>Imprint</a>&emsp;&middot;&emsp;
				<a href={org?.privacyUrl ?? ""}>Privacy</a>
			</div>
		</div>
	);
}
