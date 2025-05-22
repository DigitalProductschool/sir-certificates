import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { User, UserInvitation } from "@prisma/client";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useRouteLoaderData,
  useSearchParams,
} from "@remix-run/react";

import { ArrowDown, UserPlus, UserX, MailX } from "lucide-react";

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

import { loader as programLoader } from "./org.program.$programId";

export const meta: MetaFunction = () => {
  return [{ title: "User" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const programId = Number(params.programId);
  await requireAdminWithProgram(request, Number(params.programId));

  const user = await prisma.user.findMany({
    where: {
      OR: [
        { isSuperAdmin: true },
        {
          isAdmin: true,
          adminOfPrograms: {
            some: {
              id: programId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
    },
    orderBy: {
      firstName: "asc",
    },
  });
  const invitations = await prisma.userInvitation.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return json({ user, invitations });
};

type Match = {
  id: string;
  pathname: string;
  data: typeof loader;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) => <Link to={match.pathname}>User</Link>,
};

export default function UserIndexPage() {
  const { user, invitations } = useLoaderData<typeof loader>();
  const { program } = useRouteLoaderData<typeof programLoader>(
    "routes/org.program.$programId",
  );
  const [searchParams, setSearchParams] = useSearchParams();

  let sortedUser = user;
  if (searchParams.has("sort")) {
    switch (searchParams.get("sort")) {
      case "name":
        sortedUser = user.toSorted((a: User, b: User) => {
          if (a.firstName < b.firstName) {
            return -1;
          }
          if (a.firstName > b.firstName) {
            return 1;
          }
          return 0;
        });
        break;
      case "email":
        sortedUser = user.toSorted((a: User, b: User) => {
          if (a.email < b.email) {
            return -1;
          }
          if (a.email > b.email) {
            return 1;
          }
          return 0;
        });
        break;
      case "permission":
        sortedUser = user.toSorted((a: User, b: User) => {
          if (a.isSuperAdmin && !b.isSuperAdmin) {
            return -1;
          }
          if (!a.isAdmin && b.isAdmin) {
            return 1;
          }
          if (a.isAdmin && !b.isAdmin) {
            return -1;
          }
          if (!a.isSuperAdmin && b.isSuperAdmin) {
            return 1;
          }
          return 0;
        });
        break;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild>
          <Link to="invite">
            <UserPlus strokeWidth={3} />
            Invite Program Manager
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        The following people can manage certificates and settings for{" "}
        {program.name}.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("sort", "name");
                  setSearchParams(params, {
                    preventScrollReset: true,
                  });
                }}
              >
                Name {searchParams.get("sort") === "name" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead className="font-medium">
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("sort", "email");
                  setSearchParams(params, {
                    preventScrollReset: true,
                  });
                }}
              >
                Email {searchParams.get("sort") === "email" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("sort", "permission");
                  setSearchParams(params, {
                    preventScrollReset: true,
                  });
                }}
              >
                Permissions{" "}
                {searchParams.get("sort") === "permission" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invite: UserInvitation) => (
            <TableRow key={invite.id} className="text-muted-foreground">
              <TableCell>
                {invite.firstName} {invite.lastName}
              </TableCell>
              <TableCell className="font-medium">{invite.email}</TableCell>
              <TableCell>Invite pending…</TableCell>
              <TableCell className="text-foreground">
                <Form action={`invite/${invite.id}/delete`} method="POST">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">
                        <MailX className="h-4 w-4" /> Cancel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Cancel invitation
                    </TooltipContent>
                  </Tooltip>
                </Form>
              </TableCell>
            </TableRow>
          ))}
          {sortedUser.map((u: User) => (
            <TableRow key={u.id}>
              <TableCell>
                {u.firstName} {u.lastName}
              </TableCell>
              <TableCell className="font-medium">{u.email}</TableCell>
              <TableCell>
                {u.isSuperAdmin
                  ? "Super Admin"
                  : u.isAdmin
                    ? "Program Manager"
                    : "View Certificates"}
              </TableCell>
              <TableCell>
                {!u.isSuperAdmin && (
                  <Form action={`${u.id}/remove`} method="POST">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="submit"
                          variant="outline"
                          aria-label="Remove program manager permissions"
                        >
                          <UserX className="h-4 w-4" /> Remove
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Remove access</TooltipContent>
                    </Tooltip>
                  </Form>
                )}
              </TableCell>
            </TableRow>
          ))}
          {user.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-destructive">
                No user in the database.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
