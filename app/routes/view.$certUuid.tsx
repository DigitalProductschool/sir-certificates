import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ params }) => {
  const certificate = await prisma.certificate.findUnique({
    where: {
      uuid: params.certUuid,
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ certificate });
};

export default function Index() {
  const { certificate } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col items-center h-dvh overflow-auto p-16 md:p-24 lg:p-32 gap-4 bg-muted">
      <Button asChild>
        <Link to={`/cert/${certificate.uuid}/download.pdf`} reloadDocument>
          Download Certificate
        </Link>
      </Button>

      <img
        className="drop-shadow-xl w-full max-w-[1190px]"
        src={`/cert/${certificate.uuid}/preview.png?t=${certificate.updatedAt}`}
        alt="Preview of the certificate"
      />
    </div>
  );
}
