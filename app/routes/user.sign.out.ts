import type { Route } from "./+types/user.sign.out";

import { logout } from "~/lib/auth.server";

// @todo refactor to action function to prevent annoying link attacks
export async function loader({ request }: Route.LoaderArgs) {
	return await logout(request);
}
