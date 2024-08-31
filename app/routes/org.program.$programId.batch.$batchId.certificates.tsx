import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Batch, Certificate } from "@prisma/client";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { Badge } from "~/components/ui/badge";
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

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "Certificates" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);

  const batch = await prisma.batch.findUnique({
    where: {
      id: Number(params.batchId),
    },
    include: {
      certificates: true,
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
  breadcrumb: (data: LoaderReturnType) => <Link to="#">{data.batch.name}</Link>,
};

export default function ProgramPage() {
  const { batch } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Firstname</TableHead>
            <TableHead>Lastname</TableHead>
            <TableHead className="font-medium">Email</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Track</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batch.certificates.map((cert: Certificate) => (
            <TableRow key={cert.email}>
              <TableCell>{cert.firstName}</TableCell>
              <TableCell>{cert.lastName}</TableCell>
              <TableCell className="font-medium">{cert.email}</TableCell>
              <TableCell>
                <Badge variant="outline">empty</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">empty</Badge>
              </TableCell>
            </TableRow>
          ))}
          {batch.certificates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No certificates created yet</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
