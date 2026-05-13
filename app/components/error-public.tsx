import type { ReactNode } from "react";
import {
	isRouteErrorResponse,
	useRouteError,
	type ErrorResponse,
} from "react-router";
import TiffyLost from "./icons/tiffy-lost";
import TiffyBroken from "./icons/tiffy-broken";

export interface CustomErrorMessages {
	[key: number]: {
		title: string;
		message: string;
		detail: string;
	};
}

export function ErrorPublic({
	customErrors = {},
}: {
	customErrors?: CustomErrorMessages;
}) {
	const error = useRouteError();

	let content: ReactNode;

	if (isRouteErrorResponse(error)) {
		const routeError = error as ErrorResponse;
		switch (routeError.status) {
			case 404:
				content = (
					<>
						<title>{customErrors[404]?.title || "Not found"}</title>
						<TiffyLost className="size-24" />
						<p>
							{customErrors[404]?.message ||
								"The page you were looking for is not here."}
						</p>
						<p className="text-center text-xs">
							{customErrors[404]?.message ||
								"Error 404: Not found."}
						</p>
					</>
				);
				break;
			default:
				content = (
					<>
						<title>Server Error</title>
						<TiffyBroken className="size-24" />
						<p className="text-center text-xs">
							We&apos;re sorry, but there was a problem.
							<br />
							This is the error message we got:
						</p>
						<p>
							Error {routeError.status}
							<br />
							{routeError.statusText}
						</p>
					</>
				);
		}
	} else {
		const clientError = error as Error;
		content = (
			<>
				<title>Error</title>
				<TiffyBroken className="size-24" />
				<p className="text-center text-xs">
					We&apos;re sorry, but there was a problem.
					<br />
					This is the error message we got:
				</p>
				{clientError.message}
			</>
		);
	}

	return (
		<div className="w-full h-full flex flex-col justify-center items-center gap-4">
			{content}
		</div>
	);
}
