import type { Certificate } from "@prisma/client";
import { useFetcher } from "@remix-run/react";
import { SendIcon, LoaderCircle } from "lucide-react";
import { Button } from "~/components/ui/button";

interface SendNotificationProps {
	certificate: Certificate;
}

export function CertificateSendNotification({ certificate }: SendNotificationProps) {
	const fetcher = useFetcher();
	return (
		<fetcher.Form action={`/cert/${certificate.uuid}/notify`} method="POST">
			<Button type="submit" disabled={fetcher.state !== "idle"}>
				{fetcher.state !== "idle" ? (
					<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<SendIcon className="mr-2 h-4 w-4" />
				)}
				Send
			</Button>
		</fetcher.Form>
	);
}
