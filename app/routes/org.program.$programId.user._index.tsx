import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { User, UserInvitation } from "@prisma/client";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useRouteLoaderData,
} from "@remix-run/react";

import { UserPlus, UserX, MailX } from "lucide-react";

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
            <TableHead>Name</TableHead>
            <TableHead className="font-medium">Email</TableHead>
            <TableHead>Permissions</TableHead>
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
          {user.map((u: User) => (
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
