import type { ReactNode } from "react";
import { useFetcher } from "react-router";

interface AsyncActionProps {
	action: string;
	children?: ReactNode;
}

// @refactor for better user feedback (animation / toast)
// @refactor for compatibility with DropdownMenu (i.e. in CertificateMenu) 

export function AsyncAction({ action, children }: AsyncActionProps) {
	const fetcher = useFetcher();
	return (
		<fetcher.Form
			action={action}
			method="POST"
			className={fetcher.state !== "idle" ? "opacity-50" : ""}
			preventScrollReset
		>
			{children}
		</fetcher.Form>
	);
}
