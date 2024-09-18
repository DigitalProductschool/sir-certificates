import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Program } from "@prisma/client";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Settings } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "Programs" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireAdmin(request);

  const programs = await prisma.program.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return json({ programs });
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
  const { programs } = useLoaderData<typeof loader>();

  return (
    <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start gap-4 md:gap-8">
      <div className="col-span-3">
        <Button asChild>
          <Link to="create">Add Program</Link>
        </Button>
      </div>

      {programs.map((program: Program) => (
        <Card key={program.id}>
          <CardHeader className="pb-3 flex-row items-center">
            <CardTitle className="grow">
              <Link to={`${program.id}/batch`}>{program.name}</Link>
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" asChild>
                  <Link to={`${program.id}/edit`} aria-label="Edit program">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Edit program</TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent className="max-w-lg text-balance leading-relaxed flex flex-row gap-4">
            <Button variant="outline" asChild>
              <Link to={`${program.id}/batch`}>Certificates</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`${program.id}/templates`}>Templates</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
