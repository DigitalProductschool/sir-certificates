import type { Route } from "./+types/user.verification-info";
import { Layout } from "~/components/layout";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { getPublicOrg } from "~/lib/organisation.server";

export async function loader() {
	const org = await getPublicOrg();
	return { org };
}

export default function VerificationInfoPage({
	loaderData,
}: Route.ComponentProps) {
	const { org } = loaderData;
	return (
		<Layout type="modal">
			<Card className="mx-auto max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">
						User registration
					</CardTitle>
					<CardDescription>
						Please verify your email to activate your account.
					</CardDescription>
				</CardHeader>

				<CardContent className="grid gap-4">
					Thank you for signing up to {org?.name} Certificates. Before
					you can get started, we need to verify your email address.
					Please check your inbox and click on the link we just sent
					you.
				</CardContent>
			</Card>
		</Layout>
	);
}
