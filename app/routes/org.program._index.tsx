import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { ProgramWithLogo } from "~/lib/program.server";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { FileBadge, FilePen, Settings, UsersIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { requireAdmin } from "~/lib/auth.server";
import { getProgramsByAdmin } from "~/lib/program.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction = () => {
  return [{ title: "Programs" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const adminId = await requireAdmin(request);
  const programs = await getProgramsByAdmin(adminId, { logo: true });
  const batches = await prisma.batch.findMany({
    where: {
      programId: {
        in: programs.map((p) => p.id),
      },
    },
    include: {
      _count: {
        select: {
          certificates: true,
        },
      },
    },
  });

  return json({ programs, batches });
};

type Match = {
  id: string;
  pathname: string;
  data: typeof loader;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) => <Link to={match.pathname}>Programs</Link>,
};

export default function OrgIndex() {
  const { programs, batches } = useLoaderData<typeof loader>();

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 items-start gap-4 md:gap-8">
      <div className="col-span-1 lg:col-span-2 xl:col-span-3">
        <Button asChild>
          <Link to="create">Add Program</Link>
        </Button>
      </div>

      {programs.map((program: ProgramWithLogo) => {
        let countCertificates = 0;
        batches.forEach(
          (b: { programId: number; _count: { certificates: number } }) => {
            if (b.programId === program.id) {
              countCertificates += b._count.certificates;
            }
          },
        );
        return (
          <Card key={program.id}>
            <CardHeader className="pb-4">
              <CardTitle className="grow">
                <Link
                  to={`${program.id}/batch`}
                  className="flex flex-row items-center gap-4"
                >
                  {program.logo && (
                    <img
                      src={`/view/logo/${program.logo.id}.svg`}
                      alt=""
                      role="presentation"
                      className="w-8 aspect-square"
                    />
                  )}
                  {program.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild>
                <Link to={`${program.id}/batch`}>
                  <FileBadge className="h-4 w-4" /> Certificates
                </Link>
              </Button>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <Link to={`${program.id}/templates`}>
                        <FilePen className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit templates</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <Link
                        to={`${program.id}/user`}
                        aria-label="Manage access"
                      >
                        <UsersIcon className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Manage access</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <Link
                        to={`${program.id}/settings`}
                        aria-label="Edit program"
                      >
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Edit program settings
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-sm text-center text-muted-foreground">
                {countCertificates} certificates
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
