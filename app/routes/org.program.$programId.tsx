import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { ErrorResponse } from "@remix-run/react";
import type { ProgramWithBatchesAndLogo } from "~/lib/types";

import { json } from "@remix-run/node";
import {
  Link,
  Outlet,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { requireAccessToProgram } from "~/lib/program.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `${data?.program?.name}` }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const adminId = await requireAdmin(request);
  await requireAccessToProgram(adminId, Number(params.programId));

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
    include: {
      batches: true,
      logo: true,
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
  program: ProgramWithBatchesAndLogo;
};

type Match = {
  id: string;
  pathname: string;
  data: LoaderReturnType;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) => <Link to="#">{match.data.program.name}</Link>,
};

// @todo add a program index page with an overview?

export default function ProgramPage() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorInfo;

  if (isRouteErrorResponse(error)) {
    const response = error as ErrorResponse;
    errorInfo = (
      <div>
        <h1>
          {response.status} {response.statusText}
        </h1>
        <p>{response.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    errorInfo = (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
      </div>
    );
  } else {
    errorInfo = <h1>Unknown Error</h1>;
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center px-4">
      {errorInfo}
    </div>
  );
}
