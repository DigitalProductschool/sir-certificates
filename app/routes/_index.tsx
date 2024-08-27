import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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

  const org = await prisma.organisation.findUnique({
    where: {
      id: 1,
    },
  });

  return json({ user, org });
};

export default function Index() {
  const { user, org } = useLoaderData<typeof loader>();

  return (
    <Layout>
      <h1 className="text-3xl">Welcome {user?.firstName}</h1>

      <p>Happy to have you back at {org.name}</p>

      <br />

      <form action="/logout" method="POST">
        <Button type="submit" variant="outline">
          Logout
        </Button>
      </form>
    </Layout>
  );
}
