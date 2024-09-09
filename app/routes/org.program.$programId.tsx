import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Program } from "@prisma/client";
import { json } from "@remix-run/node";
import { Link, Outlet } from "@remix-run/react";

import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "Programs" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
    include: {
      batches: true,
    },
  });

  if (!program) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ program });
};

type LoaderReturnType = {
  program: Program;
};

type Match = {
  id: string;
  pathname: string;
  data: LoaderReturnType;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) => (
    <Link to={`/org/program/${match.data.program.id}/batch`}>
      {match.data.program.name}
    </Link>
  ),
};

export default function ProgramPage() {
  return <Outlet />;
}
