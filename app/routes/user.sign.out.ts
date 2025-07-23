import type { Route } from "./+types/user.sign.out";
import { redirect } from "react-router";
import { logout } from "~/lib/auth.server";

export async function action({ request }: Route.LoaderArgs) {
	return await logout(request);
}

export async function loader() {
	return redirect("/");
}
