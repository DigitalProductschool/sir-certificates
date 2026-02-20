import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates";
import type { Certificate, Template } from "~/generated/prisma/client";
import { Link, Outlet, useLocation } from "react-router";

import { ChevronDown, Eye, MailCheck, Settings } from "lucide-react";

import { CertificateRefresh } from "~/components/certificate-refresh";
import { CertificateSendNotification } from "~/components/certificate-send-notification";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { AsyncAction } from "~/components/async-action";

export function meta() {
  return [{ title: "Certificates" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

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

  return { certificates, templates };
}

export default function BatchCertificatesPage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const location = useLocation();
  const { programId } = params;
  const { certificates, templates } = loaderData;

  const view = location.state?.view ?? "table";

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
      {view === "table" && (
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
                      <div className="flex items-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" className="w-12" asChild>
                              <Link
                                to={`${cert.id}/edit`}
                                aria-label="Edit certificate"
                                preventScrollReset
                              >
                                <Settings />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Edit certificate
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8">
                              <ChevronDown />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-56 -ml-12"
                            align="start"
                          >
                            <DropdownMenuGroup>
                              <DropdownMenuItem>
                                <AsyncAction action={`${cert.id}/refresh`}>
                                  <button
                                    type="submit"
                                    className="flex flex-col items-start text-left"
                                  >
                                    <b>Refresh certificate</b>
                                    <div className="text-sm text-muted-foreground">
                                      Update template and variables to current
                                      values.
                                    </div>
                                  </button>
                                </AsyncAction>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Button variant="outline" asChild>
                        <Link to={`${cert.id}/preview`}>
                          <Eye /> Preview
                        </Link>
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
                          {cert.notifiedAt.toLocaleString("en-UK")}
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
      )}
      {view === "grid" && (
        <div className="grid auto-cols-min grid-cols-5 xl:grid-cols-6 p-8 pb-18 gap-12">
          {certificates.map((cert: Certificate) => {
            return (
              <div key={cert.email} className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground pl-1 flex-grow">
                    {cert.firstName} {cert.lastName}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8">
                        <ChevronDown />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 -ml-12" align="start">
                      <DropdownMenuGroup>
                        <DropdownMenuItem>
                          <AsyncAction action={`${cert.id}/refresh`}>
                            <button
                              type="submit"
                              className="flex flex-col items-start text-left"
                            >
                              <b>Refresh certificate</b>
                              <div className="text-sm text-muted-foreground">
                                Update template and variables to current values.
                              </div>
                            </button>
                          </AsyncAction>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <img
                  className="drop-shadow-xl self-center"
                  src={`/cert/${cert.uuid}/preview.png?t=${cert.updatedAt}`}
                  alt="Preview of the certificate"
                />
              </div>
            );
          })}
        </div>
      )}
      <Outlet />
    </div>
  );
}
