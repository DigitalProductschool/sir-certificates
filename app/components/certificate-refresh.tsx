import type { Certificate } from "@prisma/client";
import { useFetcher } from "react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";

interface CertificateRefreshProps {
	certificate: Certificate;
}

export function CertificateRefresh({ certificate }: CertificateRefreshProps) {
	const fetcher = useFetcher();
	return (
		<fetcher.Form action={`${certificate.id}/refresh`} method="POST">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						size="icon"
						variant="outline"
						disabled={fetcher.state !== "idle"}
					>
						<RefreshCw
							className={`h-4 w-4 ${fetcher.state !== "idle" ? "animate-spin" : ""}`}
						/>
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">
					Refresh this certificate
				</TooltipContent>
			</Tooltip>
		</fetcher.Form>
	);
}
