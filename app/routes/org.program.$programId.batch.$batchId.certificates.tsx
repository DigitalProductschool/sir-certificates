import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Certificate, Template } from "@prisma/client";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useParams } from "@remix-run/react";

import { MailCheck, Settings } from "lucide-react";

import { CertificateRefresh } from "~/components/certificate-refresh";
import { CertificateSendNotification } from "~/components/certificate-send-notification";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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

export const meta: MetaFunction = () => {
  return [{ title: "Certificates" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  // @todo make sure that only batches for the current program can be loaded
  // @todo check access control for the program

  const certificates = await prisma.certificate.findMany({
    where: {
      batch: {
        is: {
          id: Number(params.batchId),
          programId: Number(params.programId),
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  if (!certificates) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

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

  return json({ certificates, templates });
};

export default function BatchCertificatesPage() {
  const { programId } = useParams();
  const { certificates, templates } = useLoaderData<typeof loader>();

  const templatesMap = new Map<number, Template>();
  for (const template of templates) {
    templatesMap.set(template.id, template);
  }

  let certificatesNeedsRefresh = 0;
  for (const certificate of certificates) {
    const lastTemplateUpdate = templatesMap.get(
      certificate.templateId,
    )?.updatedAt;
    if (lastTemplateUpdate && lastTemplateUpdate > certificate.updatedAt) {
      certificatesNeedsRefresh++;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="font-medium">Email</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>
              <div className="flex items-center">
                Template&emsp;
                {certificatesNeedsRefresh > 0 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="destructive">
                        {certificatesNeedsRefresh}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {certificatesNeedsRefresh} certificates need to be
                      refreshed
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TableHead>
            <TableHead colSpan={2}>Actions</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {certificates.map((cert: Certificate) => {
            const template = templatesMap.get(cert.templateId);
            return (
              <TableRow key={cert.email}>
                <TableCell>
                  {cert.firstName} {cert.lastName}
                </TableCell>
                <TableCell className="font-medium">{cert.email}</TableCell>
                <TableCell>
                  {cert.teamName || <Badge variant="outline">empty</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-4 items-center">
                    {template?.name || (
                      <Badge variant="destructive">not found</Badge>
                    )}
                    {template?.updatedAt &&
                      template?.updatedAt > cert.updatedAt && (
                        <CertificateRefresh certificate={cert} />
                      )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-4 items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" asChild>
                          <Link
                            to={`${cert.id}/edit`}
                            aria-label="Edit certificate"
                          >
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Edit certificate
                      </TooltipContent>
                    </Tooltip>
                    <Button variant="outline" asChild>
                      <Link to={`${cert.id}/preview`}>Preview</Link>
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <CertificateSendNotification certificate={cert} />
                </TableCell>
                <TableCell>
                  {cert.notifiedAt ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MailCheck />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {new Date(cert.notifiedAt).toLocaleString()}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <>&emsp;</>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {templates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-destructive">
                No PDF templates configured yet. Please{" "}
                <Link
                  to={`/org/program/${programId}/templates`}
                  className="underline"
                >
                  add a template
                </Link>{" "}
                first.
              </TableCell>
            </TableRow>
          )}
          {certificates.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No certificates created yet</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Outlet />
    </div>
  );
}
