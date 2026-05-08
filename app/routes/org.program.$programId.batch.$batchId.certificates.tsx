import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates";
import type { Certificate, Template } from "~/generated/prisma/client";
import { Link, Outlet, useLocation, useNavigate } from "react-router";

import {
  ArrowDown,
  BadgeCheck,
  ChevronDown,
  Eye,
  MailCheck,
  RefreshCw,
  Settings,
} from "lucide-react";

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
  const navigate = useNavigate();
  const location = useLocation();
  const { programId } = params;
  const { certificates, templates } = loaderData;
  const certId = params.certId && Number(params.certId);

  const view = location.state?.view ?? "table";
  const sort = location.state?.sort ?? "firstName";

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

  let sortedCerts = certificates;
  switch (sort) {
    case "firstName": // already sorted
      break;
    case "email":
      sortedCerts = certificates.toSorted((a, b) => {
        if (a.email < b.email) {
          return -1;
        }
        if (a.email > b.email) {
          return 1;
        }
        return 0;
      });
      break;
    case "teamName":
      sortedCerts = certificates.toSorted((a, b) => {
        if ((a.teamName ?? "") < (b.teamName ?? "")) {
          return -1;
        }
        if ((a.teamName ?? "") > (b.teamName ?? "")) {
          return 1;
        }
        return 0;
      });
      break;
    case "templateId":
      sortedCerts = certificates.toSorted((a, b) => {
        if (a.templateId < b.templateId) {
          return -1;
        }
        if (a.templateId > b.templateId) {
          return 1;
        }
        return 0;
      });
      break;
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {view === "table" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" className="pl-0" asChild>
                  <Link to="." state={{ sort: "firstName" }}>
                    Name {sort === "firstName" && <ArrowDown />}
                  </Link>
                </Button>
              </TableHead>
              <TableHead className="font-medium">
                <Button variant="ghost" className="pl-0" asChild>
                  <Link to="." state={{ sort: "email" }}>
                    Email {sort === "email" && <ArrowDown />}
                  </Link>
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="pl-0" asChild>
                  <Link to="." state={{ sort: "teamName" }}>
                    Team {sort === "teamName" && <ArrowDown />}
                  </Link>
                </Button>
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  <Button variant="ghost" className="pl-0" asChild>
                    <Link to="." state={{ sort: "templateId" }}>
                      Template {sort === "templateId" && <ArrowDown />}
                    </Link>
                  </Button>
                  &emsp;
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
            {sortedCerts.map((cert: Certificate) => {
              const template = templatesMap.get(cert.templateId);
              const handleClick = () => {
                navigate(`${cert.id}/preview`, { preventScrollReset: true });
              };
              return (
                <TableRow
                  key={cert.email}
                  id={`c${cert.id}`}
                  data-state={cert.id === certId ? "selected" : ""}
                >
                  <TableCell onClick={handleClick}>
                    {cert.firstName} {cert.lastName}
                  </TableCell>
                  <TableCell className="font-medium" onClick={handleClick}>
                    {cert.email}
                  </TableCell>
                  <TableCell onClick={handleClick}>
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
                        <Link
                          to={`${cert.id}/preview`}
                          state={{ view: "table" }}
                          preventScrollReset
                        >
                          <Eye /> Preview
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CertificateSendNotification certificate={cert} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {cert.notifiedAt ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <MailCheck />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {cert.notifiedAt.toLocaleString("en-UK")}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <>&emsp;</>
                      )}
                      {cert.publishedAt ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <BadgeCheck />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {cert.publishedAt.toLocaleString("en-UK")}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <>&emsp;</>
                      )}
                    </div>
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
        <div className="grid auto-cols-min grid-cols-4 xl:grid-cols-5 p-8 pb-18 gap-12">
          {certificates.map((cert: Certificate) => {
            return (
              <div
                key={cert.email}
                id={`c${cert.id}`}
                className="flex flex-col"
              >
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
                        <DropdownMenuItem asChild>
                          <Link
                            className="flex items-center gap-1"
                            to={`${cert.id}/edit`}
                            aria-label="Edit certificate"
                            preventScrollReset
                          >
                            <Settings className="size-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <AsyncAction action={`${cert.id}/refresh`}>
                            <button
                              type="submit"
                              className="flex items-center gap-1"
                            >
                              <RefreshCw className="size-4" /> Refresh
                              certificate
                            </button>
                          </AsyncAction>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link
                  to={`${cert.id}/preview`}
                  state={{ view: "grid" }}
                  preventScrollReset
                >
                  <img
                    className="drop-shadow-xl self-center"
                    src={`/cert/${cert.uuid}/preview.png?t=${cert.updatedAt}`}
                    alt="Preview of the certificate"
                  />
                </Link>
              </div>
            );
          })}
        </div>
      )}
      <Outlet />
    </div>
  );
}
