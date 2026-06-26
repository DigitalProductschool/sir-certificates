import type { ReactNode } from "react";
import { useEffect } from "react";
import { useFetcher } from "react-router";

interface AsyncActionProps {
	action: string;
	children?: ReactNode | ((isPending: boolean) => ReactNode);
	onSuccess?: () => void;
}

export function AsyncAction({ action, children, onSuccess }: AsyncActionProps) {
	const fetcher = useFetcher();
	const isPending = fetcher.state !== "idle";

	useEffect(() => {
		// this requires the action handler to return data (not just null or redirect)
		if (fetcher.state === "idle" && fetcher.data != null) {
			onSuccess?.();
		}
	}, [fetcher.state, fetcher.data, onSuccess]);

	return (
		<fetcher.Form
			action={action}
			method="POST"
			className={isPending ? "opacity-50" : ""}
			preventScrollReset
		>
			{typeof children === "function" ? children(isPending) : children}
		</fetcher.Form>
	);
}
