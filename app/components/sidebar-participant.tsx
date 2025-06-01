import type { LoaderReturnType } from "~/routes/_index";

import { Link, NavLink, useLoaderData } from "@remix-run/react";
import { ChevronsUpDown, LogOut, SquareUser, TowerControl } from "lucide-react";

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

export function SidebarParticipant() {
  const { user, certificates } = useLoaderData<LoaderReturnType>();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="duration-200 transition-all flex mt-2 pl-4 group-data-[collapsible=icon]:mt-1 group-data-[collapsible=icon]:pl-3">
        <Link
          to="/"
          className="duration-200 transition-all flex items-center shrink-0 gap-1 text-black group-data-[collapsible=icon]:size-6"
        >
          <svg
            className="size-8"
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M39.9792 71.8087V0.309998H10.0082V71.8087C9.88754 78.7518 11.0948 85.654 13.5649 92.144C15.7741 97.81 19.1859 102.929 23.5651 107.149C28.0804 111.375 33.4587 114.572 39.3289 116.519C45.9974 118.74 52.9908 119.829 60.0189 119.741V92.3115C54.1075 92.2721 49.3061 90.4987 45.6147 86.9912C41.9234 83.4838 40.0448 78.4229 39.9792 71.8087ZM109.931 0.309998H79.9995V67.7594H110L109.931 0.309998ZM106.374 92.4297C104.165 86.7608 100.754 81.6381 96.3742 77.4147C91.8583 73.1915 86.48 69.9982 80.6104 68.0549C73.9424 65.8306 66.949 64.7383 59.9204 64.8234V92.3115C65.8318 92.3115 70.6365 94.0849 74.3344 97.6318C78.0323 101.179 79.8944 106.236 79.9207 112.804V118.164H109.921V112.804C110.074 105.853 108.893 98.9368 106.443 92.4297H106.374Z" />
          </svg>
          <span className="duration-200 transition-[width] w-30 overflow-hidden text-xl font-bold group-data-[collapsible=icon]:w-0">
            Certificates
          </span>
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
                  className="aria-current:bg-accent aria-current:font-bold !h-9 group-data-[collapsible=icon]:w-10"
                >
                  <NavLink to={`/view/${cert.uuid}`}>
                    {cert.batch.program.logo ? (
                      <div className="flex size-8 aspect-square items-center justify-center rounded-lg bg-white">
                        <img
                          src={`/view/logo/${cert.batch.program.logo.uuid}.svg`}
                          alt={cert.batch.program.name}
                          className="w-5 aspect-square"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <b>{pickCapitalLetters(cert.batch.program.name)}</b>
                      </div>
                    )}
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
                      <Link to="/org/program">
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
                    action="/user/sign/out"
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
