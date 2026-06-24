import type { Route } from "./+types/test.error";
import { isRouteErrorResponse, useRouteError } from "react-router";

import {
	ErrorPublic,
	type CustomErrorMessages,
} from "~/components/error-public";
import { requireLocalhost } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
	await requireLocalhost(request);
	return null;
}

export async function action({ request }: Route.ActionArgs) {
	await requireLocalhost(request);
	const formData = await request.formData();
	const status = Number(formData.get("status")) || 500;
	const title = (formData.get("title") as string) || "";
	const message = (formData.get("message") as string) || "";
	const detail = (formData.get("detail") as string) || "";

	throw new Response(JSON.stringify({ title, message, detail }), {
		status,
		statusText: "Test Error",
		headers: { "Content-Type": "application/json" },
	});
}

// Action always throws — component only renders on direct GET, shows nothing.
export default function TestErrorPage() {
	return <div>Error simulation will appear here</div>;
}

export function ErrorBoundary() {
	const error = useRouteError();
	let customErrors: CustomErrorMessages = {};

	if (
		isRouteErrorResponse(error) &&
		error.data &&
		typeof error.data === "object"
	) {
		console.log("error data", error.data);
		customErrors = {
			[error.status]: {
				title: error.data.title || "",
				message: error.data.message || "",
				detail: error.data.detail || "",
			},
		};
	}

	return <ErrorPublic customErrors={customErrors} />;
}
