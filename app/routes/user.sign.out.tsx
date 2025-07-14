import type { LoaderFunction } from "react-router";

import { logout } from "~/lib/auth.server";

export const action: LoaderFunction = async ({ request }) => {
	return await logout(request);
};
