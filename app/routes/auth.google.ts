import type { Route } from "./+types/auth.google";
import { authenticator } from "~/lib/auth.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
	return await authenticator.authenticate("google", request);
};
