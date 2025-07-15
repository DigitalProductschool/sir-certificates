import type { Organisation, Batch } from "@prisma/client";
import type { ProgramWithLogo, UserAuthenticated } from "~/lib/types";
import { useEffect } from "react";
import { Link, NavLink, useLocation, useParams } from "react-router";
import {
  BadgeCheck,
  BookType,
  ChevronsUpDown,
  FileBadge,
  FilePen,
  Home,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  Share2,
  SquareUser,
  UsersIcon,
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

import { useStickyState } from "~/hooks/use-sticky-state";

import { pickCapitalLetters } from "~/lib/utils";

export function SidebarAdmin({
  org,
  user,
  programs,
  latestBatch,
}: {
  org: Organisation;
  user?: UserAuthenticated;
  programs: ProgramWithLogo[];
  latestBatch?: Batch;
}) {
  const { programId, batchId } = useParams();
  const { pathname } = useLocation();

  const [lastProgramId, setLastProgramId] = useStickyState(
    "lastActiveProgram",
    programId ? Number(programId) : programs[0]?.id,
  );

  const activeProgramId = programId ? Number(programId) : lastProgramId;

  const activeProgram = programs.find((p) => p.id === activeProgramId);
  const activeBatchId = batchId ? batchId : latestBatch ? latestBatch.id : null;

  useEffect(() => {
    if (programId !== undefined) {
      setLastProgramId(Number(programId));
    }
  }, [programId, programs, setLastProgramId]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={activeProgram?.name}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {activeProgram?.logo ? (
                    <img
                      src={`/view/logo/${activeProgram.logo.uuid}.svg`}
                      alt=""
                      role="presentation"
                      className="w-8 aspect-square"
                    />
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <b>
                        {activeProgram
                          ? pickCapitalLetters(activeProgram.name)
                          : "?"}
                      </b>
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeProgram?.name}
                    </span>
                    <span className="truncate text-xs">{org.name}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                {/* todo potentially build a Notion-inspired program switcher that includes a button for the settings */}
                <DropdownMenuItem className="gap-2 p-2" asChild>
                  <NavLink to="/org/program">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                      <LayoutGrid className="size-4" />
                    </div>
                    <div className="font-medium text-muted-foreground">
                      Show all programs
                    </div>
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 p-2" asChild>
                  <NavLink to="/org/program/create">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                      <Plus className="size-4" />
                    </div>
                    <div className="font-medium text-muted-foreground">
                      Add program
                    </div>
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Open another program
                </DropdownMenuLabel>
                {programs.map((program) => (
                  <DropdownMenuItem
                    key={program.name}
                    className="gap-2 p-2"
                    asChild
                  >
                    <Link to={`/org/program/${program.id}/batch`}>
                      {program.logo ? (
                        <img
                          src={`/view/logo/${program.logo.uuid}.svg`}
                          alt=""
                          role="presentation"
                          className="size-5 ml-1 aspect-square"
                        />
                      ) : (
                        <div className="flex size-7 items-center justify-center rounded-sm border">
                          <b>{pickCapitalLetters(program.name)}</b>
                        </div>
                      )}
                      {program.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {activeProgram && (
          <>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Program Managers" asChild>
                    <NavLink
                      to={`/org/program/${activeProgram?.id}/user`}
                      className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                    >
                      <UsersIcon />
                      <span>Program Managers</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Program Settings" asChild>
                    <NavLink
                      to={`/org/program/${activeProgram?.id}/settings`}
                      className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                    >
                      <Settings />
                      <span>Settings</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Social Media" asChild>
                    <NavLink
                      to={`/org/program/${activeProgram?.id}/social`}
                      className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                    >
                      <Share2 />
                      <span>Social Media</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup className="grow">
              <SidebarGroupLabel>Certificates</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Batches and Certificates" asChild>
                    <NavLink
                      to={`/org/program/${activeProgram?.id}/batch/${
                        activeBatchId ? activeBatchId + "/certificates" : ""
                      }`}
                      className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                    >
                      <FileBadge />
                      <span>Batches</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {/*<SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Import Participants">
                    <NavLink
                      to={
                        activeBatchId
                          ? `/org/program/${activeProgram?.id}/batch/${activeBatchId}/import`
                          : `/org/program/${activeProgram?.id}/batch/create`
                      }
                      className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                    >
                      <FileUp />
                      <span>Import</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>*/}
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="PDF Templates" asChild>
                    <NavLink
                      to={`/org/program/${activeProgram?.id}/templates/`}
                      className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                    >
                      <FilePen className="w-6 h-6" size={24} />
                      <span>Templates</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            {/*<SidebarGroup className="grow">
              <SidebarGroupLabel>Templates</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
              <SidebarMenuButton tooltip="Email Templates" asChild>
                <NavLink to={`/org/program/${activeProgram.id}/emails`}>
                  <Mail />
                  <span>Email</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>*/}

            {user?.isSuperAdmin && (
              <SidebarGroup className="mb-1">
                <SidebarGroupLabel>{org.name}</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Organisation Settings" asChild>
                      <NavLink
                        to={`/org/settings`}
                        className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                      >
                        <Home />
                        <span>Organisation</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="User" asChild>
                      <NavLink
                        to={`/org/user`}
                        className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                      >
                        <UsersIcon />
                        <span>User</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Typefaces" asChild>
                      <NavLink
                        to={`/org/typeface`}
                        className="aria-[current]:bg-sidebar-accent aria-[current]:font-bold"
                      >
                        <BookType />
                        <span>Typefaces</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip="Account"
                >
                  <Avatar className="h-8 w-8 rounded">
                    <AvatarImage
                      src="/user/photo/preview.png"
                      alt={user?.firstName}
                    />
                    <AvatarFallback className="rounded-lg">{`${user?.firstName.charAt(
                      0,
                    )}${user?.lastName.charAt(0)}`}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.firstName}
                    </span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-lg"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded">
                      <AvatarImage
                        src="/user/photo/preview.png"
                        alt={user?.firstName}
                      />
                      <AvatarFallback className="rounded-lg">{`${user?.firstName.charAt(
                        0,
                      )}${user?.lastName.charAt(0)}`}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/">
                      <BadgeCheck className="ml-0.5 mr-3.5 w-5 h-5" />
                      My Certificates
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/user/photo" state={{ fromPath: pathname }}>
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
