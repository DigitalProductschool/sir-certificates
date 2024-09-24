import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Batch, Template } from "@prisma/client";

import { useState } from "react";
import { json } from "@remix-run/node";
import { Link, useParams, useLoaderData, useNavigate } from "@remix-run/react";
import {
  CircleFadingPlus,
  CircleFadingArrowUp,
  CircleCheckBig,
  TriangleAlert,
  ArrowDown,
} from "lucide-react";

import { ToastAction } from "~/components/ui/toast";
import { useToast } from "~/components/ui/use-toast";

import { CSVDropZone } from "~/components/csv-drop-zone";
import { TaskRunner } from "~/components/task-runner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "Import Participants" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const batch = await prisma.batch.findUnique({
    where: {
      id: Number(params.batchId),
    },
  });

  const templates = await prisma.template.findMany({
    where: {
      program: {
        is: {
          id: {
            equals: Number(params.programId),
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ batch, templates });
};

type LoaderReturnType = {
  batch: Batch;
};

type Match = {
  id: string;
  pathname: string;
  data: LoaderReturnType;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) => (
    <Link to="#">Import {match.data.batch.name}</Link>
  ),
};

function StatusIndicator({ status, error }: { status: string; error: string }) {
  switch (status) {
    case "todo":
      return <CircleFadingPlus color="hsl(var(--muted-foreground))" />;
    case "pending":
      return <CircleFadingArrowUp />;
    case "done":
      return <CircleCheckBig color="green" />;
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

export default function ImportBatchPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { templates } = useLoaderData<typeof loader>();
  const [key, setKey] = useState(1);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const { toast } = useToast();

  const firstTemplate: Template | null =
    templates && templates.length > 0 ? templates[0] : null;

  const handleCSVRead = (rows: Array<Record<string, string>>) => {
    // If a template column is in the CSV, try to match the template name
    const rowsWithMeta = rows.map((row) => {
      row._status = "todo";
      if (row.template) {
        const matchingTemplate = templates.find((tpl: Template) => {
          return tpl.name.toLowerCase() === row.template.toLowerCase();
        });
        row._template = String(matchingTemplate?.id || firstTemplate?.id);
      } else {
        row._template = String(firstTemplate?.id);
      }
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

  const setRowTemplate = (index: number, template: string) => {
    setRows((rows) => {
      const update = [...rows];
      update[index]._template = template;
      return update;
    });
  };

  const handleImport = async (item: Record<string, string>, index: number) => {
    setRowStatus(index, "pending");

    const formData = new FormData();
    formData.append("firstName", item.firstname);
    formData.append("lastName", item.lastname);
    formData.append("team", item.team || "");
    formData.append("email", item.email);
    formData.append("templateId", item._template);
    formData.append("batchId", params.batchId);

    await fetch("/cert/import", {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`${response.statusText}`, {
            cause: response,
          });
        }
      })
      .then((/*certificate*/) => {
        setRowStatus(index, "done");
      })
      .catch((error) => {
        setRowStatus(index, "error", error.message);
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

  const handleFinished = () =>
    toast({
      title: "Import complete",
      description: "All participants have been imported.",
      action: (
        <ToastAction
          altText="You can navigate to the certificate list now."
          onClick={() => navigate(`../${params.batchId}/certificates`)}
        >
          Show Certificates
        </ToastAction>
      ),
    });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Prepare the list of participants for this batch as a CSV file with
        Google Spreadsheets, Excel, Numbers or a similar tool. Please make sure
        to include the required columns: <i>firstname, lastname, email</i>
        .&ensp;
        <Button variant="link" className="px-0" asChild>
          <a href="/assets/import-example.csv">
            Download CSV template
            <ArrowDown className="w-4 h-4" />
          </a>
        </Button>
      </p>

      <CSVDropZone onData={handleCSVRead} />

      <TaskRunner
        items={rows}
        itemLabel="participants"
        startLabel="Start Import"
        pauseLabel="Pause Import"
        confirmTitle="Start the import?"
        confirmDescription="The participants from the CSV file will be added to the selected batch. If a provided email is already in this batch, the name and other information will be updated to prevent duplicates."
        onRunTask={handleImport}
        onReset={handleReset}
        onFinish={handleFinished}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Firstname*</TableHead>
            <TableHead>Lastname*</TableHead>
            <TableHead className="font-medium">Email*</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Template</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: Record<string, string>, index: number) => (
            <TableRow key={row.email}>
              <TableCell>
                <StatusIndicator status={row._status} error={row._error} />
              </TableCell>
              <TableCell>
                {row.firstname || (
                  <Badge variant="destructive">firstname</Badge>
                )}
              </TableCell>
              <TableCell>
                {row.lastname || <Badge variant="destructive">lastname</Badge>}
              </TableCell>
              <TableCell className="font-medium">
                {row.email || <Badge variant="destructive">email</Badge>}
              </TableCell>
              <TableCell>
                {row.team || <Badge variant="outline">empty</Badge>}
              </TableCell>
              <TableCell>
                <Select
                  name="template"
                  value={row._template}
                  onValueChange={(value) => {
                    setRowTemplate(index, value);
                  }}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template: Template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id.toString()}
                      >
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {templates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-destructive">
                No certificate templates configured yet. Please{" "}
                <Link
                  to={`/org/program/${params.programId}/templates`}
                  className="underline"
                >
                  add a template
                </Link>{" "}
                first.
              </TableCell>
            </TableRow>
          )}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                No participants to import. Please select a CSV file first.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
