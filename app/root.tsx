import type { Route } from "./+types/root";
import type { LinksFunction, ErrorResponse } from "react-router";

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";

import { Toaster } from "~/components/ui/toaster";
import { getPublicOrg } from "./lib/organisation.server";

import styles from "./tailwind.css?url";
import { TooltipProvider } from "./components/ui/tooltip";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `${data?.org?.name} Certificates` },
    {
      name: "description",
      content: `All of your certificates from ${
        data?.org?.name || "this organisation"
      } in one place.`,
    },
  ];
}

export async function loader() {
  const org = await getPublicOrg();
  return { org };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
        <link rel="mask-icon" href="/favicon.svg" color="#000000" />
        <Meta />
        <Links />
      </head>
      <body className="bg-muted/40">
        {children}

        <ScrollRestoration />
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={0}>
      <Outlet />
    </TooltipProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  //console.error(error);
  let errorInfo;

  if (isRouteErrorResponse(error)) {
    const response = error as ErrorResponse;
    errorInfo = (
      <div>
        <h1>
          {response.status} {response.statusText}
        </h1>
        <p>{response.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    errorInfo = (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
      </div>
    );
  } else {
    errorInfo = <h1>Unknown Error</h1>;
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center px-4">
      {errorInfo}
    </div>
  );
}
