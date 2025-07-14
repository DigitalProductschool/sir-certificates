import type { Route } from "./+types/org.user.$userId.edit";
import type { ActionFunction } from "react-router";
import { useEffect, useState } from "react";
import { Form, redirect, useNavigate } from "react-router";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MultiSelect } from "~/components/ui/multi-select";
import { Switch } from "~/components/ui/switch";

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getProgramsByAdmin } from "~/lib/program.server";

export function meta() {
  return [{ title: "Edit User" }];
}

export const action: ActionFunction = async ({ request, params }) => {
  const adminId = await requireSuperAdmin(request);
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
  });

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };

  // @todo check access control
  const userIsAdmin = inputs.isAdmin === "yes";

  const setAdminOfPrograms = inputs.adminOfPrograms
    ? inputs.adminOfPrograms.split(",").map((id: string) => {
        return { id: Number(id) };
      })
    : [];

  // @todo add error handling (i.e. user not found)

  // @todo @security add access-control, program managers can only edit users associated with their programs

  const update: {
    firstName: string;
    lastName: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
    adminOfPrograms?: object;
  } = {
    firstName: inputs.firstName,
    lastName: inputs.lastName,
    isAdmin:
      userIsAdmin || (admin?.isSuperAdmin && inputs.isSuperAdmin === "yes") // automatically set isAdmin true for super admins
        ? true
        : false,
  };

  if (admin?.isSuperAdmin) {
    // only allow updating this for super admins
    update.isSuperAdmin = inputs.isSuperAdmin === "yes" ? true : false;
  }

  if (userIsAdmin) {
    update.adminOfPrograms = {
      set: setAdminOfPrograms,
    };
  }

  await prisma.user.update({
    where: {
      id: Number(params.userId),
    },
    data: update,
  });

  return redirect(`/org/user`);
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const adminId = await requireSuperAdmin(request);
  const admin = await prisma.user.findUnique({
    where: {
      id: adminId,
    },
    select: {
      id: true,
      isAdmin: true,
      isSuperAdmin: true,
      adminOfPrograms: true,
    },
  });

  // @todo add access-control, program managers can only edit users associated with their programs

  const user = await prisma.user.findUnique({
    where: {
      id: Number(params.userId),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
      adminOfPrograms: true,
    },
  });

  if (!user) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const programs = await getProgramsByAdmin(adminId);

  return { admin, user, programs };
}

export default function EditUserDialog({ loaderData }: Route.ComponentProps) {
  const { admin, user, programs } = loaderData;
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [isSuperAdmin, setIsSuperAdmin] = useState(user.isSuperAdmin);

  const programList = programs.map((p) => {
    return { value: p.id.toString(), label: p.name };
  });

  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(
    user.adminOfPrograms.map((p) => p.id.toString()),
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[625px] pointer-events-auto">
        <Form method="POST">
          <DialogHeader>
            <DialogTitle>User settings</DialogTitle>
            <DialogDescription>
              Here you can change the user name or give them admin permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={user.firstName}
            />
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" defaultValue={user.lastName} />
            {admin?.isSuperAdmin && (
              <div className="flex items-end">
                <Label
                  htmlFor="isSuperAdmin"
                  className="flex flex-col flex-1 leading-6"
                >
                  Super admin permissions
                  <span className="text-muted-foreground font-normal">
                    Give full access to all organisation and program settings
                  </span>
                </Label>
                <Switch
                  key={user.id}
                  id="isSuperAdmin"
                  name="isSuperAdmin"
                  value="yes"
                  checked={isSuperAdmin}
                  onCheckedChange={setIsSuperAdmin}
                />
              </div>
            )}
            {isSuperAdmin ? (
              <Label
                htmlFor="isAdmin"
                className="flex flex-col flex-1 leading-6"
              >
                Program manager permissions
                <span className="text-muted-foreground font-normal">
                  Super admins automatically have full access to all programs
                </span>
              </Label>
            ) : (
              <>
                <div className="flex items-end">
                  <Label
                    htmlFor="isAdmin"
                    className="flex flex-col flex-1 leading-6"
                  >
                    Program manager permissions
                    <span className="text-muted-foreground font-normal">
                      Give access to the following programs
                    </span>
                  </Label>
                  <Switch
                    id="isAdmin"
                    name="isAdmin"
                    value="yes"
                    checked={isAdmin}
                    onCheckedChange={setIsAdmin}
                  />
                </div>

                {isAdmin && (
                  <>
                    <MultiSelect
                      options={programList}
                      onValueChange={setSelectedPrograms}
                      defaultValue={selectedPrograms}
                      placeholder="Select programs"
                      variant="inverted"
                      animation={0}
                      maxCount={3}
                      disabled={!isAdmin}
                    />
                    <input
                      type="hidden"
                      name="adminOfPrograms"
                      value={selectedPrograms.join(",")}
                    />
                  </>
                )}
              </>
            )}

            {/* @todo list of programs the user is managing */}
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
