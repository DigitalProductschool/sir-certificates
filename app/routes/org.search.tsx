import type { Route } from "./+types/org.search";
import type { Route as RootRoute } from "../+types/root";
import { Link, useRouteLoaderData } from "react-router";

import { requireAdmin } from "~/lib/auth.server";
import { getProgramsByAdmin } from "~/lib/program.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "Search Organisation" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const adminId = await requireAdmin(request);
  const accessiblePrograms = (await getProgramsByAdmin(adminId)).map(
    (program) => program.id,
  );

  const term = new URL(request.url).searchParams.get("term");

  const certificates = await prisma.certificate.findMany({
    where: {
      OR: [
        {
          firstName: {
            startsWith: term ?? undefined,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            startsWith: term ?? undefined,
            mode: "insensitive",
          },
        },
      ],
      AND: [
        {
          batch: {
            is: {
              programId: {
                in: accessiblePrograms,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      uuid: true,
      firstName: true,
      lastName: true,
      teamName: true,
      batch: {
        select: {
          id: true,
          name: true,
          program: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return {
    term,
    /* search results */
    results: {
      certificates,
    },
  };
}

export default function OrgSearchResults({ loaderData }: Route.ComponentProps) {
  const org =
    useRouteLoaderData<RootRoute.ComponentProps["loaderData"]>("root")?.org;
  const term = loaderData.term ?? "";
  const certificates = loaderData.results.certificates;

  return (
    <div className="grid gap-8 py-4 max-w-[625px]">
      <p>
        Search results for ›{term}‹ in {org?.name}.
      </p>
      Found {certificates.length} certificate(s).
      <ul>
        {certificates.map((cert) => (
          <li key={cert.uuid}>
            <Link
              to={`/org/program/${cert.batch.program.id}/batch/${cert.batch.id}/certificates/${cert.id}/preview`}
              className="hover:underline"
            >
              {cert.firstName} {cert.lastName} – Team: {cert.teamName} – Batch:{" "}
              {cert.batch.name} – Program: {cert.batch.program.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
