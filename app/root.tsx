import type { LinksFunction } from "@remix-run/node";
import type { ErrorResponse } from "@remix-run/react";

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";

import { Toaster } from "~/components/ui/toaster";

import styles from "./tailwind.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

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
      <body>
        {children}
        <ScrollRestoration />
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);
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
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    errorInfo = <h1>Unknown Error</h1>;
  }

  return (
    <html lang="en">
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="h-screen w-full flex flex-col items-center justify-center px-4">
          {errorInfo}
        </div>
        <Scripts />
      </body>
    </html>
  );
}
