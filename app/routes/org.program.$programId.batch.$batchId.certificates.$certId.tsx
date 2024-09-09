import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Certificate } from "@prisma/client";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { XIcon } from "lucide-react";

import { H2 } from "~/components/typography/headlines";

import { Button } from "~/components/ui/button";

import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  // @todo require admin
  await requireUserId(request);

  const certificate = await prisma.certificate.findUnique({
    where: {
      id: Number(params.certId),
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

type LoaderReturnType = {
  certificate: Certificate;
};

type Match = {
  id: string;
  pathname: string;
  data: LoaderReturnType;
  params: Record<string,string>
}

export const handle = {
  breadcrumb: (match: Match) => (
    <Link to="#">
      {match.data.certificate.firstName} {match.data.certificate.lastName}
    </Link>
  ),
};

export default function CertificatePage() {
  const { certificate } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col bg-background h-full w-[40%] mt-24 fixed z-50 bottom-0 right-0 p-4 gap-8 pb-12 overflow-auto">
      <div className="flex justify-end">
        <Button variant="outline" size="icon" asChild>
          <Link to="../">
            <XIcon className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <H2 /* className="flex px-8" */>
        {certificate.firstName} {certificate.lastName}
      </H2>

      <div className="flex px-8">
        <Button asChild>
          <Link to={`/cert/${certificate.id}/download.pdf`} reloadDocument>
            Download Certificate
          </Link>
        </Button>
      </div>

      <img
        className="px-8 drop-shadow-xl self-center"
        src={`/cert/${certificate.id}/preview.png?t=${certificate.updatedAt}`}
        alt="Preview of the certificate"
      />
    </div>
  );
}
