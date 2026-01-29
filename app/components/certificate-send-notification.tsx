import type { Certificate } from "~/generated/prisma/client";
import { useFetcher } from "react-router";
import { SendIcon, LoaderCircle } from "lucide-react";
import { Button } from "~/components/ui/button";

interface SendNotificationProps {
	certificate: Certificate;
}

export function CertificateSendNotification({
	certificate,
}: SendNotificationProps) {
	const fetcher = useFetcher();
	const wasSent = certificate.notifiedAt ? true : false;
	return (
		<fetcher.Form action={`/cert/${certificate.uuid}/notify`} method="POST">
			<Button
				type="submit"
				disabled={fetcher.state !== "idle"}
				variant={wasSent ? "outline" : "default"}
			>
				{fetcher.state !== "idle" ? (
					<LoaderCircle className="mr-2 animate-spin" />
				) : (
					<SendIcon className="mr-2" />
				)}
				{wasSent ? "Resend" : "Send"}
			</Button>
		</fetcher.Form>
	);
}
