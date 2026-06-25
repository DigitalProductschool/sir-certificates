import type { Route } from "./+types/org.program.$programId.batch";
import type { Batch } from "~/generated/prisma/client";

import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { LayoutGrid, TableIcon, Settings } from "lucide-react";

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

import { BatchActionDialog } from "~/components/batch-action-dialog";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.program?.name} Batches` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request); // access to program is managed at parent route

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

  return { program };
}

export default function BatchPage({
  loaderData,
  params,
  matches,
}: Route.ComponentProps) {
  const { program } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();

  const view = location.state?.view ?? "table";

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
                    {currentBatch?.startDate.toLocaleDateString("en-UK")}–{" "}
                    {currentBatch?.endDate.toLocaleDateString("en-UK")}
                  </div>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {program.batches.map((batch: Batch) => {
                return (
                  <SelectItem
                    key={batch.id}
                    value={batch.id.toString()}
                    textValue={batch.name}
                  >
                    {batch.name}
                    <div className="text-xs text-muted-foreground">
                      {batch.startDate.toLocaleDateString("en-UK")}–{" "}
                      {batch.endDate.toLocaleDateString("en-UK")}
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
                  <Settings />
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
          <>
            <Button variant="outline" asChild>
              <Link to={`${params.batchId}/certificates/create`}>
                Add Certificate
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to={`${params.batchId}/import`}>Import Certificates</Link>
            </Button>

            <Button variant="outline" asChild>
              <Link
                to={`${params.batchId}/certificates/download.zip`}
                reloadDocument
              >
                Download All
              </Link>
            </Button>
            <BatchActionDialog
              programId={params.programId!}
              batchId={params.batchId!}
              triggerLabel="Publish All"
              title="Publish All Certificates"
              description="After publishing, the certificates will be immediately available online, but not yet sent to participants' email."
              actionLabel="Publish Now"
              progressLabel="published"
              allDoneMessage="All certificates in this batch are already published."
              toastTitle="All certificates published!"
              filterFn={(c) => !c.publishedAt}
              getEndpoint={(c) =>
                `/org/program/${params.programId}/batch/${params.batchId}/certificates/${c.id}/publish`
              }
            />
            <BatchActionDialog
              programId={params.programId!}
              batchId={params.batchId!}
              triggerLabel="Send All"
              title="Send All Certificates"
              description="Each participant will receive an email with their certificate attached."
              actionLabel="Send Now"
              progressLabel="sent"
              allDoneMessage="All certificates in this batch have already been sent."
              toastTitle="All certificates sent!"
              filterFn={(c) => !c.notifiedAt}
              getEndpoint={(c) => `/cert/${c.uuid}/notify`}
            />

            <div className="flex-grow" />

            <div className="flex">
              <Button variant="ghost" size="icon" asChild>
                <Link
                  to={`${currentBatch.id}/certificates`}
                  aria-label="Table View"
                  state={{ view: "table" }}
                  aria-current={view === "table"}
                  className={`aria-[current=false]:text-muted-foreground`}
                >
                  <TableIcon />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link
                  to={`${currentBatch.id}/certificates`}
                  aria-label="Table View"
                  state={{ view: "grid" }}
                  aria-current={view === "grid"}
                  className={`aria-[current=false]:text-muted-foreground`}
                >
                  <LayoutGrid />
                </Link>
              </Button>
            </div>
          </>
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
