import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Batch, Prisma } from "@prisma/client";
import { useEffect } from "react";
import { json } from "@remix-run/node";
import {
  Link,
  Outlet,
  useLoaderData,
  useNavigate,
  useMatches,
  useParams,
} from "@remix-run/react";

import { Settings } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

type ProgramWithBatches = Prisma.ProgramGetPayload<{
  include: { batches: true };
}>;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `${data.program?.name} Batches` }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
    include: {
      batches: {
        orderBy: {
          startDate: "desc",
        },
      },
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
  program: ProgramWithBatches;
};

type Match = {
  id: string;
  pathname: string;
  data: LoaderReturnType;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) =>
    match.params.batchId ? (
      <Link to="#">
        {
          match.data.program.batches.find(
            (batch) => batch.id === Number(match.params.batchId),
          )?.name
        }
      </Link>
    ) : (
      <Link to="#">Batches</Link>
    ),
};

export default function BatchPage() {
  const { program } = useLoaderData<typeof loader>();
  const params = useParams();
  const navigate = useNavigate();
  const matches = useMatches();

  const latestBatch =
    program.batches.length > 0 ? program.batches[0] : undefined;

  const currentBatch = program.batches.find(
    (batch: Batch) =>
      Number(params.batchId) > 0 && batch.id === Number(params.batchId),
  );

  const handleBatchSelect = (value: string) => {
    navigate(`/org/program/${program.id}/batch/${value}/certificates`);
  };

  useEffect(() => {
    // IF at least one batch exists AND we're on program level THEN navigate to the latest batch
    if (latestBatch && matches.length === 4) {
      navigate(
        `/org/program/${program.id}/batch/${latestBatch.id}/certificates`,
        { replace: true },
      );
    }
  }, [program.id, matches, latestBatch, navigate]);

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
      <div className="flex items-center gap-4">
        {program.batches.length > 0 && (
          <Select
            key={params.batchId}
            defaultValue={params.batchId}
            onValueChange={handleBatchSelect}
          >
            <SelectTrigger className="w-[280px] [&>span]:line-clamp-none">
              <SelectValue placeholder="Select a Batch" asChild>
                <div className="flex gap-2 text-left items-center">
                  {currentBatch?.name}
                  <div className="text-xs text-muted-foreground">
                    {new Date(currentBatch?.startDate).toLocaleDateString()}–{" "}
                    {new Date(currentBatch?.endDate).toLocaleDateString()}
                  </div>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {program.batches.map((batch: Batch) => {
                // batch is still a JSON object, not an actual Batch
                // @todo check if https://www.prisma.io/docs/orm/prisma-client/type-safety#what-are-generated-types can help here to operate on the correct type
                const startDate = new Date(batch.startDate);
                const endDate = new Date(batch.endDate);
                return (
                  <SelectItem
                    key={batch.id}
                    value={batch.id.toString()}
                    textValue={batch.name}
                  >
                    {batch.name}
                    <div className="text-xs text-muted-foreground">
                      {startDate.toLocaleDateString()}–{" "}
                      {endDate.toLocaleDateString()}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        {currentBatch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" asChild>
                <Link
                  to={`${currentBatch.id}/edit`}
                  aria-label="Edit batch settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Edit batch settings</TooltipContent>
          </Tooltip>
        )}

        <Button variant="outline" asChild>
          <Link to="create">Add Batch</Link>
        </Button>

        {currentBatch && (
          <Button variant="outline" asChild>
            <Link to={`${params.batchId}/certificates/create`}>
              Add Certificate
            </Link>
          </Button>
        )}

        {program.batches.length === 0 && (
          <div>No batches added yet. Create your first batch.</div>
        )}
      </div>

      {program.batches.length === 0 && (
        <div className="text-muted-foreground">
          Certificates are organized in batches. Start by adding your first
          batch.
        </div>
      )}

      <Outlet />
    </div>
  );
}
