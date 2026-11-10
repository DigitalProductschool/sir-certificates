import type { Route } from "./+types/org.user._index";
import { Form, Link, useSearchParams } from "react-router";
import { ArrowDown, Settings, Trash2Icon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

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

// Compact elapsed time, e.g. "5m ago", "3h ago", "2d ago"
function formatElapsed(date: Date) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
      createdAt: true,
      isAdmin: true,
      adminOfPrograms: true,
    },
  });

  // Invitations store program ids as a plain Int[] (no relation), so resolve names separately
  const programs = await prisma.program.findMany({
    where: {
      id: { in: invitations.flatMap((invite) => invite.adminOfPrograms) },
    },
    select: { id: true, name: true },
  });

  const invitationsWithPrograms = invitations.map((invite) => ({
    id: invite.id,
    firstName: invite.firstName,
    lastName: invite.lastName,
    email: invite.email,
    isAdmin: invite.isAdmin,
    createdAt: invite.createdAt,
    programs: programs.filter((p) => invite.adminOfPrograms.includes(p.id)),
  }));

  return { user, invitations: invitationsWithPrograms };
}

export default function UserIndexPage({ loaderData }: Route.ComponentProps) {
  const { user, invitations } = loaderData;

  // @todo prevent sorting from triggering a new data fetch (probably by implementing a clientLoader)
  const [searchParams, setSearchParams] = useSearchParams();

  const group = searchParams.get("group") ?? "all";
  const filteredUser = user.filter((u) => {
    if (group === "admins") return u.isAdmin || u.isSuperAdmin;
    if (group === "participants") return !u.isAdmin && !u.isSuperAdmin;
    return true;
  });
  // Pending invitations are all admin invitations
  const showInvitations = group !== "participants";

  let sortedUser = filteredUser;
  if (searchParams.has("sort")) {
    switch (searchParams.get("sort")) {
      case "name":
        sortedUser = filteredUser.toSorted((a, b) => {
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
        sortedUser = filteredUser.toSorted((a, b) => {
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
        sortedUser = filteredUser.toSorted((a, b) => {
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

  const onSetSort = (propName: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", propName);
    setSearchParams(params, {
      preventScrollReset: true,
    });
  };

  const onSetGroup = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("group");
    } else {
      params.set("group", value);
    }
    setSearchParams(params, {
      preventScrollReset: true,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Tabs value={group} onValueChange={onSetGroup}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button asChild size="sm">
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
                onClick={() => onSetSort("name")}
              >
                Name {searchParams.get("sort") === "name" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead className="font-medium">
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => onSetSort("email")}
              >
                Email {searchParams.get("sort") === "email" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                className="pl-0"
                onClick={() => onSetSort("permission")}
              >
                Permissions{" "}
                {searchParams.get("sort") === "permission" && <ArrowDown />}
              </Button>
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showInvitations &&
            invitations.map((invite) => (
              <TableRow key={invite.id} className="text-muted-foreground">
                <TableCell>
                  {invite.firstName} {invite.lastName}
                </TableCell>
                <TableCell className="font-medium">{invite.email}</TableCell>
                <TableCell>
                  Invite pending…{" "}
                  {invite.isAdmin && (
                    <>
                      as Program Manager:{" "}
                      {invite.programs.map((p) => p.name).join(", ")}
                    </>
                  )}
                </TableCell>
                <TableCell className="text-foreground">
                  <div className="flex items-center gap-3">
                    <Form action={`invite/${invite.id}/delete`} method="POST">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline">
                            <Trash2Icon /> Cancel
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Cancel invitation
                        </TooltipContent>
                      </Tooltip>
                    </Form>
                    <span
                      className="text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatElapsed(invite.createdAt)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          {sortedUser.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="align-top py-4">
                {u.firstName} {u.lastName}
              </TableCell>
              <TableCell className="align-top py-4 font-medium">
                {u.email}
              </TableCell>
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
                        <Settings /> Edit
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit user settings</TooltipContent>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {filteredUser.length === 0 &&
            !(showInvitations && invitations.length > 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-destructive">
                  No users found.
                </TableCell>
              </TableRow>
            )}
        </TableBody>
      </Table>
      <div className="text-xs text-muted-foreground pl-4">
        {filteredUser.length} {filteredUser.length === 1 ? "user" : "users"}
        {showInvitations && invitations.length > 0 && (
          <>
            {" "}
            + {invitations.length} pending{" "}
            {invitations.length === 1 ? "invitation" : "invitations"}
          </>
        )}
      </div>
    </div>
  );
}
