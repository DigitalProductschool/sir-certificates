import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { User, UserInvitation } from "@prisma/client";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";

import { Settings, Trash2Icon } from "lucide-react";

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

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: "User" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireAdmin(request);

  const user = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isAdmin: true,
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

  return (
    <>
      <div>
        <Button asChild>
          <Link to="invite">Invite Admin</Link>
        </Button>
      </div>
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
                      <Button variant="outline" size="icon">
                        <Trash2Icon className="h-4 w-4" />
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
              <TableCell>{u.isAdmin ? "Admin" : "Viewer"}</TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" asChild>
                      <Link to={`${u.id}/edit`} aria-label="Edit user settings">
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit user settings</TooltipContent>
                </Tooltip>
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
    </>
  );
}
