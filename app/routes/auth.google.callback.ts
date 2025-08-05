import type { Route } from "./+types/auth.google.callback";

import { authenticator, createUserSessionAndRedirect } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await authenticator.authenticate("google", request);
  return createUserSessionAndRedirect(user, "/");
}
