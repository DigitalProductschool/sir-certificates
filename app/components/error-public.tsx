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
						<p className="text-center text-balance">
							{customErrors[404]?.message ||
								"The page you were looking for is not here."}
						</p>
						<p className="text-center text-xs">
							{customErrors[404]?.detail ||
								"Error 404: Not found."}
						</p>
					</>
				);
				break;
			case 403:
				content = (
					<>
						<title>{customErrors[403]?.title || "Access denied"}</title>
						<TiffyBroken className="size-24" />
						<p className="text-center text-balance">
							{customErrors[403]?.message ||
								"You need an additional permission to access this page."}
						</p>
						<p className="text-center text-xs">
							{customErrors[403]?.detail ||
								"Error 403: Forbidden."}
						</p>
					</>
				);
				break;
			case 400:
				content = (
					<>
						<title>{customErrors[400]?.title || "Uhhhhmmmm"}</title>
						<TiffyLost className="size-24" />
						<p className="text-center text-balance">
							{customErrors[400]?.message ||
								"We got a badly mangled request or invalid input data. In any case, no idea how to proceed here."}
						</p>
						<p className="text-center text-xs">
							{customErrors[400]?.detail ||
								"Error 400: Bad request."}
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
		<div className="w-full h-full flex flex-col justify-center items-center gap-4 p-8">
			{content}
		</div>
	);
}
