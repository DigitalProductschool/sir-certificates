import type { Route } from "./+types/user.sign.out";

import { logout } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
	return await logout(request);
}
