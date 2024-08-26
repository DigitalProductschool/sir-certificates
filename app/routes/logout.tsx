import type { LoaderFunction } from "@remix-run/node";

import { logout } from "~/lib/auth.server";

export const action: LoaderFunction = async ({ request }) => {
	return await logout(request);
};
