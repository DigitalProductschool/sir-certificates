import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates";
import type { Certificate, Template } from "~/generated/prisma/client";
import { Link, Outlet, useLocation, useNavigate } from "react-router";

import {
  ArrowDown,
  BadgeCheck,
  BadgeIcon,
  BadgePlus,
  Download,
  Eye,
  FileUp,
  LayoutGrid,
  MailCheck,
  MailOpen,
  Send,
  TableIcon,
} from "lucide-react";

import { BatchActionDialog } from "~/components/batch-action-dialog";
import { CertificateRefresh } from "~/components/certificate-refresh";
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

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { CertificateMenu } from "~/components/certificate-menu";

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

  const currentPath = location.pathname.replace(/\/$/, ""); // remove trailing slash from path during SSR

  // @refactor to a hook or context?
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

  const hasPublishedCertificates = certificates.some(
    (c) => c.publishedAt !== null,
  );

  const hasNotifiedCertificates = certificates.some(
    (c) => c.notifiedAt !== null,
  );

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
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link to="create">
            <BadgePlus /> Add Certificate
          </Link>
        </Button>

        <Button
          variant={certificates.length === 0 ? "default" : "outline"}
          asChild
        >
          <Link
            to={`/org/program/${params.programId}/batch/${params.batchId}/import`}
          >
            <FileUp /> Import Certificates
          </Link>
        </Button>

        <div className="flex-grow">&emsp;</div>

        <Button variant="outline" asChild>
          <Link to="download.zip" reloadDocument>
            <Download />
            Download All
          </Link>
        </Button>

        {/* @todo add check if social preview exists before publish all – show a warning if not / or general complete setup flow? */}

        <BatchActionDialog
          certificates={certificates}
          triggerIcon={<BadgeCheck />}
          triggerLabel="Publish All"
          primary={!hasPublishedCertificates}
          title="Publish all certificates"
          description="A published certificate will be accessible online through it's unique link and also visible to logged-in users. Published certificates can also be verified through the included QR code. The certificates are not being emailed to recipients during this step."
          actionLabel="Publish Now"
          progressLabel="published"
          allDoneMessage="all certificates published"
          toastTitle="All certificates published!"
          filterFn={(c) => !c.publishedAt}
          getEndpoint={(c) =>
            `/org/program/${params.programId}/batch/${params.batchId}/certificates/${c.id}/publish`
          }
        />
        <BatchActionDialog
          certificates={certificates}
          triggerIcon={<Send />}
          triggerLabel="Send All"
          primary={hasPublishedCertificates && !hasNotifiedCertificates}
          title="Send all certificates"
          description="Each participant will receive an email with their certificate attached as a PDF. Unpublished certificates will also be sent, but without a link to the online certificate."
          actionLabel="Send Now"
          progressLabel="sent"
          allDoneMessage="all certificates sent via email"
          toastTitle="All certificates sent!"
          filterFn={(c) => !c.notifiedAt}
          getEndpoint={(c) => `/cert/${c.uuid}/notify`}
        />

        <div>&emsp;</div>

        <div className="flex">
          <Button variant="ghost" size="icon" asChild>
            <Link
              to={currentPath}
              aria-label="Table View"
              state={{ view: "table" }}
              aria-current={view === "table"}
              className="aria-[current=false]:text-muted-foreground"
            >
              <TableIcon />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link
              to={currentPath}
              aria-label="Grid View"
              state={{ view: "grid" }}
              aria-current={view === "grid"}
              className="aria-[current=false]:text-muted-foreground"
            >
              <LayoutGrid />
            </Link>
          </Button>
        </div>
      </div>

      {view === "table" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" className="pl-0" asChild>
                  <Link to={currentPath} state={{ sort: "firstName" }}>
                    Name {sort === "firstName" && <ArrowDown />}
                  </Link>
                </Button>
              </TableHead>
              <TableHead className="font-medium">
                <Button variant="ghost" className="pl-0" asChild>
                  <Link to={currentPath} state={{ sort: "email" }}>
                    Email {sort === "email" && <ArrowDown />}
                  </Link>
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="pl-0" asChild>
                  <Link to={currentPath} state={{ sort: "teamName" }}>
                    Team {sort === "teamName" && <ArrowDown />}
                  </Link>
                </Button>
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  <Button variant="ghost" className="pl-0" asChild>
                    <Link to={currentPath} state={{ sort: "templateId" }}>
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
              <TableHead>Actions</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCerts.map((cert: Certificate) => {
              const template = templatesMap.get(cert.templateId);
              const handleClick = () => {
                navigate(`${cert.id}/preview`, {
                  preventScrollReset: true,
                  state: {
                    view,
                    sort,
                    certListIds: sortedCerts.map((c) => c.id),
                  },
                });
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
                    <div className="flex items-center">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to={`${cert.id}/preview`}
                          state={{
                            view: "table",
                            sort,
                            certListIds: sortedCerts.map((c) => c.id),
                          }}
                          preventScrollReset
                        >
                          <Eye /> Open
                        </Link>
                      </Button>
                      <CertificateMenu
                        certificate={cert}
                        programId={programId}
                        view={view}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {cert.publishedAt ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <BadgeCheck className="size-5 text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Published at
                            <br />
                            {cert.publishedAt.toLocaleString("en-UK")}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <BadgeIcon className="size-5 text-gray-200" />
                      )}

                      {cert.notifiedAt ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <MailCheck className="size-5 text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Mail sent
                            <br />
                            {cert.notifiedAt.toLocaleString("en-UK")}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <MailOpen className="size-5 text-gray-200" />
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
                <TableCell colSpan={5}>No certificates created yet.</TableCell>
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
                  <div className="flex flex-grow text-sm text-muted-foreground pl-1 gap-1">
                    {cert.publishedAt ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <BadgeCheck className="size-5 text-slate-500" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Published at
                          <br />
                          {cert.publishedAt.toLocaleString("en-UK")}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <BadgeIcon className="size-5 text-gray-200" />
                    )}
                    {cert.firstName} {cert.lastName}
                  </div>
                  <CertificateMenu
                    certificate={cert}
                    programId={programId}
                    view={view}
                  />
                </div>
                <Link
                  to={`${cert.id}/preview`}
                  state={{
                    view: "grid",
                    sort,
                    certListIds: sortedCerts.map((c) => c.id),
                  }}
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
