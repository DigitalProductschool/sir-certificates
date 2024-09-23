import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Organisation, User } from "@prisma/client";
import { json } from "@remix-run/node";
import { NavLink, Link, Outlet } from "@remix-run/react";
import { Layout } from "~/components/layout";
import { Breadcrumbs } from "~/components/breadcrumbs";
import {
  BadgeCheck,
  Home,
  Package2,
  PanelLeft,
  Search,
  Settings,
  User as UserIcon,
  UserRound,
  BookType,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { requireAdmin, getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = `${data.org?.name} Certificates`;
  return [{ title }, { name: "description", content: "Welcome to Remix!" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireAdmin(request);
  const user = await getUser(request);

  let org = await prisma.organisation.findUnique({
    where: {
      id: 1,
    },
  });

  if (!org) {
    org = { id: 1, name: "Unknown Organisation" };
  }

  return json({ user, org });
};

type LoaderReturnType = {
  user: User;
  org: Organisation;
};

type Match = {
  id: string;
  pathname: string;
  data: LoaderReturnType;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) => (
    <Link to="/org/program">
      {match.data.org ? match.data.org.name : "Organisation"}
    </Link>
  ),
};

export default function OrgDashboard() {
  return (
    <Layout type="full">
      <TooltipProvider delayDuration={0}>
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
          <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            <Link
              to="/"
              className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
            >
              <BadgeCheck className="h-4 w-4 transition-all group-hover:scale-110" />
              <span className="sr-only">Certificates</span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="program"
                  className="flex h-9 w-9 items-center justify-center rounded-lg aria-current:bg-accent aria-current:text-accent-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <Home className="h-5 w-5" />
                  <span className="sr-only">Programs</span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">Programs</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="user"
                  className="flex h-9 w-9 items-center justify-center rounded-lg aria-current:bg-accent aria-current:text-accent-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <UserIcon className="h-5 w-5" />
                  <span className="sr-only">User</span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">User</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="typeface"
                  className="flex h-9 w-9 items-center justify-center rounded-lg aria-current:bg-accent aria-current:text-accent-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <BookType className="h-5 w-5" />
                  <span className="sr-only">Typefaces</span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">Typefaces</TooltipContent>
            </Tooltip>
          </nav>
          <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="settings"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground aria-current:bg-accent aria-current:text-accent-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                >
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </nav>
        </aside>
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs">
                <nav className="grid gap-6 text-lg font-medium">
                  <Link
                    to="#"
                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                  >
                    <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span className="sr-only">Certificates</span>
                  </Link>
                  <Link
                    to="program"
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <Home className="h-5 w-5" />
                    Programs
                  </Link>
                  <Link
                    to="user"
                    className="flex items-center gap-4 px-2.5 text-foreground"
                  >
                    <UserIcon className="h-5 w-5" />
                    User
                  </Link>
                  {/*<Link
                    to="#"
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <LineChart className="h-5 w-5" />
                    Settings
                  </Link>*/}
                </nav>
              </SheetContent>
            </Sheet>
            <Breadcrumbs />
            <div className="relative ml-auto flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
                disabled
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="overflow-hidden rounded-full"
                >
                  <UserRound />
                  {/*<img
                  src="/placeholder-user.jpg"
                  width={36}
                  height={36}
                  alt="Avatar"
                  className="overflow-hidden rounded-full"
                />*/}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/*<DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />*/}
                <DropdownMenuItem>
                  <form action="/user/logout" method="POST">
                    <button type="submit">Logout</button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-4">
            <Outlet />
          </main>
        </div>
      </TooltipProvider>
    </Layout>
  );
}
