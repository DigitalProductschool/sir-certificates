import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Program, Batch } from "@prisma/client";
import { json } from "@remix-run/node";
import { NavLink, Link, Outlet, useLoaderData } from "@remix-run/react";

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

  const latestBatch = program.batches[program.batches.length - 1];

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-3">
      <div className="flex items-center gap-4">
        <Select defaultValue={latestBatch.id.toString()}>
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

        <NavLink
          to={`batch/${latestBatch.id}/import`}
          className={({ isActive }) =>
            isActive ? "bg-background p-2 rounded-md" : "p-2 rounded-md"
          }
        >
          Import Participants
        </NavLink>

        {program.batches.length === 0 && (
          <div>No batches added yet. Create your first batch.</div>
        )}
      </div>

      <Outlet />
    </div>
  );
}
