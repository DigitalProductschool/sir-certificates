import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Batch } from "@prisma/client";

import { useState } from "react";
import { json } from "@remix-run/node";
import { Link, useParams } from "@remix-run/react";

import {
  CircleFadingPlus,
  CircleFadingArrowUp,
  CircleCheckBig,
  TriangleAlert,
} from "lucide-react";

import { CSVDropZone } from "~/components/csv-drop-zone";
import { TaskRunner } from "~/components/task-runner";

import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "Import Participants" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);

  const batch = await prisma.batch.findUnique({
    where: {
      id: Number(params.batchId),
    },
  });

  if (!batch) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ batch });
};

type LoaderReturnType = {
  batch: Batch;
};

export const handle = {
  breadcrumb: (data: LoaderReturnType) => (
    <Link to="#">Import {data.batch.name}</Link>
  ),
};

function StatusIndicator({ status, error }: { status: string; error: string }) {
  switch (status) {
    case "todo":
      return <CircleFadingPlus />;
    case "pending":
      return <CircleFadingArrowUp />;
    case "done":
      return <CircleCheckBig />;
    case "error":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <TriangleAlert color="orange" />
          </TooltipTrigger>
          <TooltipContent side="top">{error}</TooltipContent>
        </Tooltip>
      );
  }
  return <></>;
}

export default function ImportPage() {
  const params = useParams();
  const [key, setKey] = useState(1);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);

  const handleCSVRead = (rows: Array<Record<string, string>>) => {
    const rowsWithMeta = rows.map((row) => {
      row._status = "todo";
      return row;
    });
    setRows(rowsWithMeta);
    setKey(key + 1);
  };

  const setRowStatus = (index: number, status: string, error = "") => {
    setRows((rows) => {
      const update = [...rows];
      update[index]._status = status;
      if (status === "error") {
        update[index]._error = error;
      }
      return update;
    });
  };

  const handleImport = async (item: Record<string, string>, index: number) => {
    setRowStatus(index, "pending");

    const formData = new FormData();
    formData.append("firstName", item.firstname);
    formData.append("lastName", item.lastname);
    formData.append("email", item.email);
    formData.append("batchId", params.batchId);

    await fetch("/api/import", {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`${response.status} ${response.statusText}`, {
            cause: response,
          });
        }
      })
      .then((certificate) => {
        console.log("Created certificate", certificate);
        setRowStatus(index, "done");
      })
      .catch((error) => {
        setRowStatus(index, "error", error.message);
        console.log("Caught", error, error.cause);
      });
  };

  const handleReset = () => {
    setRows((rows) => {
      const update = rows.map((row) => {
        return { ...row, _status: "todo", error: "" };
      });
      return update;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <CSVDropZone onData={handleCSVRead} />

      <TaskRunner
        items={rows}
        itemLabel="participants"
        startLabel="Start Import"
        confirmLabel="Are you sure?"
        onRunTask={handleImport}
        onReset={handleReset}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Firstname</TableHead>
            <TableHead>Lastname</TableHead>
            <TableHead className="font-medium">Email</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Track</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: Record<string, string>) => (
            <TableRow key={row.email}>
              <TableCell>
                <StatusIndicator status={row._status} error={row._error} />
              </TableCell>
              <TableCell>{row.firstname}</TableCell>
              <TableCell>{row.lastname}</TableCell>
              <TableCell className="font-medium">{row.email}</TableCell>
              <TableCell>
                {row.team || <Badge variant="outline">empty</Badge>}
              </TableCell>
              <TableCell>
                {row.track || <Badge variant="outline">empty</Badge>}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                No participants to import. Please select a file first.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
