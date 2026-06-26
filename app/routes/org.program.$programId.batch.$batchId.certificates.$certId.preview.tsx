import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.$certId.preview";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import {
  Settings,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Preview Certificate" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const certificate = await prisma.certificate.findUnique({
    where: {
      id: Number(params.certId),
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const socialPreview = await prisma.socialPreview.findUnique({
    where: {
      programId: Number(params.programId),
    },
  });

  return { certificate, socialPreview };
}

export default function CertificatePage({
  loaderData,
  params,
}: Route.ComponentProps) {
  const { certificate, socialPreview } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();

  const view = location.state?.view ?? "table";
  const sort = location.state?.sort;
  const certListIds: number[] = location.state?.certListIds ?? [];
  const currentIdx = certListIds.indexOf(Number(params.certId));
  const prevId = currentIdx > 0 ? certListIds[currentIdx - 1] : null;
  const nextId =
    currentIdx < certListIds.length - 1 ? certListIds[currentIdx + 1] : null;
  const navState = { view, sort, certListIds };

  const closeUrl = `/org/program/${params.programId}/batch/${params.batchId}/certificates`;
  const closeState = { view };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "ArrowLeft" || e.key === "ArrowUp") && prevId) {
        e.preventDefault();
        navigate(`../${prevId}/preview`, {
          preventScrollReset: true,
          state: navState,
        });
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowDown") && nextId) {
        e.preventDefault();
        navigate(`../${nextId}/preview`, {
          preventScrollReset: true,
          state: navState,
        });
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate, prevId, nextId]);

  function handleOpenChange(open: boolean) {
    if (!open) {
      navigate(closeUrl, { preventScrollReset: true, state: closeState });
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[800px] max-h-[90svh] flex flex-col gap-0 p-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={!prevId}
              asChild={!!prevId}
            >
              {prevId ? (
                <Link
                  to={`../${prevId}/preview`}
                  state={navState}
                  preventScrollReset
                >
                  <ArrowLeft aria-label="Open previous" />
                </Link>
              ) : (
                <ArrowLeft />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!nextId}
              asChild={!!nextId}
            >
              {nextId ? (
                <Link
                  to={`../${nextId}/preview`}
                  state={navState}
                  preventScrollReset
                >
                  <ArrowRight aria-label="Open next" />
                </Link>
              ) : (
                <ArrowRight />
              )}
            </Button>
            <DialogTitle className="flex-1 ml-2">
              {certificate.firstName} {certificate.lastName}
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="bg-muted overflow-y-auto flex flex-col gap-6 px-6 py-6">
          <div className="flex gap-2 flex-wrap">
            <Button asChild>
              <Link to={`/cert/${certificate.uuid}/download.pdf`} reloadDocument>
                Download Certificate
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                to={`/org/program/${params.programId}/batch/${params.batchId}/certificates/${certificate.id}/edit`}
                aria-label="Edit certificate"
                preventScrollReset
              >
                <Settings /> Edit
              </Link>
            </Button>
            <div className="grow"/>
            <Button variant="link" asChild>
              <Link to={`/view/${certificate.uuid}`}>
                View public page <ArrowUpRight />
              </Link>
            </Button>
          </div>

          <img
            className="drop-shadow-xl self-center w-full"
            src={`/cert/${certificate.uuid}/preview.png?t=${certificate.updatedAt}`}
            alt="Preview of the certificate"
          />

          {socialPreview && (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted-foreground">
                Social Media Preview
              </span>
              <img
                src={`/cert/${certificate.uuid}/social-preview.png?t=${certificate.updatedAt}`}
                className="drop-shadow-xl aspect-[1.91/1]"
                alt="Social media preview for shared certificates"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
