import type { ReactNode } from "react";
import { useFetcher } from "react-router";

interface AsyncActionProps {
	action: string;
	children?: ReactNode;
}

export function AsyncAction({ action, children }: AsyncActionProps) {
	const fetcher = useFetcher();
	return (
		<fetcher.Form
			action={action}
			method="POST"
			className={fetcher.state !== "idle" ? "opacity-50" : ""}
		>
			{children}
		</fetcher.Form>
	);
}
