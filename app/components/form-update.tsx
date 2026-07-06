import { useEffect, useRef, useState } from "react";
import { useFetcher, type HTMLFormMethod } from "react-router";
import { LoaderCircle, Undo2 } from "lucide-react";
import { Button } from "~/components/ui/button";

interface FormUpdateProps {
	action?: string;
	method?: HTMLFormMethod;
	className?: string;
	children: React.ReactNode;
	preventScrollReset?: boolean;
}

export function FormUpdate({
	children,
	action,
	method = "POST",
	className = "",
	preventScrollReset = true,
}: FormUpdateProps) {
	const fetcher = useFetcher();
	const formRef = useRef<HTMLFormElement | null>(null);
	const [hasChanges, setHasChanges] = useState(false);
	const [isValid, setIsValid] = useState(false);
	const prevFetcherState = useRef(fetcher.state);

	useEffect(() => {
		if (prevFetcherState.current !== "idle" && fetcher.state === "idle") {
			formRef.current?.reset();
			setHasChanges(false);
		}
		prevFetcherState.current = fetcher.state;
	}, [fetcher.state]);

	return (
		<fetcher.Form
			ref={formRef}
			action={action}
			method={method}
			className={`flex gap-2 ${className}`}
			onChange={() => {
				setHasChanges(true);
				setIsValid(formRef?.current?.checkValidity() ?? false);
			}}
			preventScrollReset={preventScrollReset}
		>
			{children}
			<div className="flex gap-2">
				<Button
					type="submit"
					variant={hasChanges ? "default" : "outline"}
					className="w-16"
					disabled={!hasChanges || !isValid}
				>
					{fetcher.state === "idle" ? (
						"Save"
					) : (
						<LoaderCircle className="animate-spin" />
					)}
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={() => {
						formRef?.current?.reset();
						setHasChanges(false);
					}}
					size="icon"
					className={
						hasChanges && fetcher.state === "idle"
							? "visible"
							: "invisible"
					}
					disabled={!hasChanges}
					title="Reset changes"
				>
					<Undo2 />
				</Button>
			</div>
		</fetcher.Form>
	);
}
