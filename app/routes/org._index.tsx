import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Program } from "@prisma/client";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "Programs" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);

  const programs = await prisma.program.findMany();

  return json({ programs });
};

export default function OrgIndex() {
  const { programs } = useLoaderData<typeof loader>();

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      {programs.map((program: Program) => (
        <Card
          key={program.id}
          className="sm:col-span-2"
          x-chunk="dashboard-05-chunk-0"
        >
          <CardHeader className="pb-3">
            <CardTitle>
              <Link to={`program/${program.id}/batch`}>{program.name}</Link>
            </CardTitle>
            <CardDescription className="max-w-lg text-balance leading-relaxed">
              <Link to={`program/${program.id}/batch`}>Certificates</Link> |{" "}
              <Link to={`program/${program.id}/templates`}>Templates</Link>
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
