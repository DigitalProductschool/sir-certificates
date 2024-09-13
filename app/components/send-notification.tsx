import type { Certificate } from "@prisma/client";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";

interface SendNotificationProps {
	certificate: Certificate;
}

export function SendNotification({ certificate }: SendNotificationProps) {
	const fetcher = useFetcher();
	return (
		<fetcher.Form action={`/cert/${certificate.uuid}/notify`} method="POST">
			<Button type="submit" disabled={fetcher.state !== "idle"}>
				Notify
			</Button>
		</fetcher.Form>
	);
}
