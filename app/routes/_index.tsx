import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Layout } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { requireUserId, getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  const user = await getUser(request);

  let org = await prisma.organisation.findUnique({
    where: {
      id: 1,
    },
  });

  if (!org) {
    org = { id: 1, name: "Unknown Organisation" };
  }

  return json({ user, org });
};

export default function Index() {
  const { user, org } = useLoaderData<typeof loader>();

  return (
    <Layout type="modal">
      <h1 className="text-3xl">Welcome {user?.firstName}</h1>

      <p>Happy to have you back at {org.name}</p>

      {user && user.isAdmin && (
        <p>
          <Link to="/org/program">Go to Admin</Link>
        </p>
      )}

      <br />

      <form action="/user/logout" method="POST">
        <Button type="submit" variant="outline">
          Logout
        </Button>
      </form>
    </Layout>
  );
}
