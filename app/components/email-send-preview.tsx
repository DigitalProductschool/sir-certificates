import { useFetcher } from "react-router";
import { LoaderCircle, SendIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

export function EmailSendPreview({ action }: { action: string }) {
	const fetcher = useFetcher();
	const isSending = fetcher.state !== "idle";

	return (
		<fetcher.Form action={action} method="post">
			<Button type="submit" variant="outline" size="sm" disabled={isSending}>
				{isSending ? (
					<LoaderCircle className="animate-spin" />
				) : (
					<SendIcon />
				)}
				Send preview email
			</Button>
		</fetcher.Form>
	);
}
