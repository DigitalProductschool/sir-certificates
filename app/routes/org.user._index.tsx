import type { Route } from "./+types/org.user._index";
import { Form, Link, useSearchParams } from "react-router";
import { ArrowDown, Settings, Trash2Icon } from "lucide-react";
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

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export function meta() {
  return [{ title: "User" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);

  const user = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
      adminOfPrograms: true,
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

  return { user, invitations };
}

export default function UserIndexPage({ loaderData }: Route.ComponentProps) {
  const { user, invitations } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  let sortedUser = user;
  if (searchParams.has("sort")) {
    switch (searchParams.get("sort")) {
      case "name":
        sortedUser = user.toSorted((a, b) => {
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
        sortedUser = user.toSorted((a, b) => {
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
        sortedUser = user.toSorted((a, b) => {
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
          <Link to="invite">Invite Admin</Link>
        </Button>
      </div>
      <Table>
        <colgroup>
          <col width="20%" />
          <col width="20%" />
          <col width="40%" />
          <col />
        </colgroup>
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
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invite) => (
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
                        <Trash2Icon className="h-4 w-4" /> Cancel
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
          {sortedUser.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="align-top py-4">
                {u.firstName} {u.lastName}
              </TableCell>
              <TableCell className="align-top py-4 font-medium">{u.email}</TableCell>
              <TableCell className="align-top py-4">
                {u.isSuperAdmin ? (
                  "Super Admin"
                ) : u.isAdmin ? (
                  <>
                    <b>Program Manager</b>:{" "}
                    {u.adminOfPrograms.map((p) => p.name).join(", ")}
                  </>
                ) : (
                  "View Certificates"
                )}
              </TableCell>
              <TableCell>
                {/* @todo show edit only if permissions are there / show this view only to super-admins, create a separate user view per program? */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" asChild>
                      <Link to={`${u.id}/edit`} aria-label="Edit user settings">
                        <Settings className="h-4 w-4" /> Edit
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
    </div>
  );
}
