import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
// import { useLoaderData, Link } from "@remix-run/react";
import { Layout } from "~/components/layout";
// import { Button } from "~/components/ui/button";
// import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async (/*{ request, params }*/) => {
  // const certificate = prisma.certificate.findUnique();

  const certificate = {};

  return json({ certificate });
};

export default function Index() {
  // const { certificate } = useLoaderData<typeof loader>();

  return (
    <Layout type="modal">
      <h1 className="text-3xl">Certificate View</h1>
    </Layout>
  );
}
