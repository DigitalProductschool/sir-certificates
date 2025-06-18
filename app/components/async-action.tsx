import { useFetcher } from "@remix-run/react";
import { ReactNode } from "react";

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
