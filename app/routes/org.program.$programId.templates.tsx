import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Template } from "@prisma/client";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useNavigate } from "@remix-run/react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = `${data.program?.name} Templates`;
  return [{ title }, { name: "description", content: "Welcome to Remix!" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
    include: {
      templates: true,
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

export const handle = {
  breadcrumb: () => <Link to="#">Templates</Link>,
};

export default function ProgramPage() {
  const { program } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {program.templates.map((template: Template) => (
            <TableRow
              key={template.id}
              onClick={() => navigate(`${template.id}`)}
              className="cursor-pointer"
            >
              <TableCell>{template.name}</TableCell>
              <TableCell>
                <Button variant="outline" asChild>
                  <Link to={`${template.id}`}>Show</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {program.templates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No templates created yet</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Add Template</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add template</DialogTitle>
            <DialogDescription>
              Upload a new certificate template for this program, then configure the layout options in the next step.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name">
                Select PDF
              </Label>
              <Input
                id="pdf"
                type="file"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Upload PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Outlet />
    </div>
  );
}
