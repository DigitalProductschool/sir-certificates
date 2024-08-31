import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Program, Batch } from "@prisma/client";
import { useEffect } from "react";
import { json } from "@remix-run/node";
import {
  NavLink,
  Link,
  Outlet,
  useLoaderData,
  useNavigate,
  useMatches,
  useParams,
} from "@remix-run/react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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

export const handle = {
  breadcrumb: (data: LoaderReturnType) => (
    <Link to={`/org/program/${data.program.id}`}>{data.program.name}</Link>
  ),
};

export default function ProgramPage() {
  const { program } = useLoaderData<typeof loader>();
  const params = useParams();
  const navigate = useNavigate();
  const matches = useMatches();

  const latestBatch =
    program.batches.length > 0
      ? program.batches[program.batches.length - 1]
      : undefined;

  const handleBatchSelect = (value: string) => {
    navigate(`/org/program/${program.id}/batch/${value}/certificates`);
  };

  useEffect(() => {
    // IF at least one batch exists AND we're on program level THEN navigate to the latest batch
    if (latestBatch && matches.length === 3) {
      navigate(
        `/org/program/${program.id}/batch/${latestBatch.id}/certificates`,
      );
    }
  }, [program.id, matches, latestBatch, navigate]);

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
      <div className="flex items-center gap-4">
        {latestBatch && (
          <>
            <Select
              key={params.batchId}
              defaultValue={params.batchId}
              onValueChange={handleBatchSelect}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a Batch" />
              </SelectTrigger>
              <SelectContent>
                {program.batches.toReversed().map((batch: Batch) => (
                  <SelectItem key={batch.id} value={batch.id.toString()}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {matches.length > 3 && (
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <NavLink
                  to={`batch/${params.batchId}/certificates`}
                  className={({ isActive }) =>
                    isActive
                      ? "bg-background text-foreground shadow-sm rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background"
                      : "rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background"
                  }
                >
                  Certificates
                </NavLink>
                <NavLink
                  to={`batch/${params.batchId}/import`}
                  className={({ isActive }) =>
                    isActive
                      ? "bg-background text-foreground shadow-sm rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background"
                      : "rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background"
                  }
                >
                  Import Participants
                </NavLink>
              </div>
            )}
          </>
        )}

        {program.batches.length === 0 && (
          <div>No batches added yet. Create your first batch.</div>
        )}
      </div>

      <Outlet />
    </div>
  );
}
