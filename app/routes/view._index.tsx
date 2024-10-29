import type { MetaFunction } from "@remix-run/node";
import { useRouteLoaderData } from "@remix-run/react";
import { SidebarTrigger } from "~/components/ui/sidebar";

import { loader } from "./view";

export const meta: MetaFunction = () => {
  return [{ title: "Certificates" }];
};

// @todo improve this view

export default function Index() {
  const { user } = useRouteLoaderData<typeof loader>("routes/view");
  return (
    <>
      <header className="sticky top-0 flex items-center h-14 px-4 py-3 gap-4 border-b sm:static sm:h-auto sm:border-0 sm:bg-transparent ">
        {user && <SidebarTrigger className="-ml-1" />}
      </header>
      <div className="flex flex-col items-center justify-center h-full pb-14">
        No certificate selected
      </div>
    </>
  );
}
