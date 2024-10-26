import type { User, Organisation, Prisma } from "@prisma/client";
import { Link, NavLink, useLoaderData } from "@remix-run/react";
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  SquareUser,
  TowerControl,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

import { pickCapitalLetters } from "~/lib/utils";

type CertificatesWithBatchAndProgram = Prisma.CertificateGetPayload<{
  include: {
    batch: {
      include: {
        program: true;
      };
    };
  };
}>;

// Loader from /_index route
export type LoaderReturnType = {
  user: User;
  org: Organisation;
  certificates: CertificatesWithBatchAndProgram[];
};

export function SidebarParticipant() {
  const { user, certificates } = useLoaderData<LoaderReturnType>();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <BadgeCheck className="h-4 w-4 transition-all group-hover:scale-110" />
          <span className="sr-only">Certificates</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="duration-200 group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel>Your Certificates</SidebarGroupLabel>
          <SidebarMenu>
            {certificates.map((cert) => (
              <SidebarMenuItem key={cert.id}>
                <SidebarMenuButton
                  tooltip={`${cert.batch.program.name} – ${cert.batch.name}`}
                  asChild
                >
                  <NavLink
                    to={`/view/${cert.uuid}`}
                    className="aria-current:bg-accent aria-current:font-bold"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <b>{pickCapitalLetters(cert.batch.program.name)}</b>
                    </div>
                    <span>{cert.batch.name}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded">
                    <AvatarImage
                      src="/user/photo/preview.png"
                      alt={user.firstName}
                    />
                    <AvatarFallback className="rounded-lg">{`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user.firstName}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded">
                      <AvatarImage
                        src="/user/photo/preview.png"
                        alt={user.firstName}
                      />
                      <AvatarFallback className="rounded-lg">{`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {user.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/org">
                        <TowerControl className="ml-0.5 mr-3.5 w-5 h-5" />
                        Administration
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/user/photo">
                      <SquareUser className="ml-0.5 mr-3.5 w-5 h-5" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <form
                    action="/user/logout"
                    method="POST"
                    className="flex grow"
                  >
                    <button type="submit" className="flex grow">
                      <LogOut className="ml-0.5 mr-3.5 w-5 h-5" />
                      Log out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
