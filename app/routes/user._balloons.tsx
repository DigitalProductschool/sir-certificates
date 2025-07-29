import type { Route as RootRoute } from "../+types/root";
import { useEffect, useState } from "react";
import { useSearchParams, Outlet, useRouteLoaderData } from "react-router";
import { CheckIcon } from "lucide-react";
import { Balloons } from "~/components/balloons.client";
import { useIsMobile } from "~/hooks/use-mobile";

export default function UserBalloons() {
  const { org } =
    useRouteLoaderData<RootRoute.ComponentProps["loaderData"]>("root") ?? {};
  const [searchParams /*, setSearchParams*/] = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="h-screen grid grid-cols-2">
      {!isMobile && (
        <div className="relative h-screen bg-zinc-900">
          {isClient && <Balloons />}
          <div className="absolute top-8 inset-x-8 flex text-white items-center">
            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-12 invert"
              role="presentation"
            />
            &emsp;
            <span className="text-3xl font-bold tracking-wide">
              Certificates
            </span>
          </div>
          <div className="absolute bottom-4 inset-x-8 text-xs text-muted-foreground/50 italic">
            &ldquo;Balloons&rdquo; adapted from{" "}
            <a
              href="https://codesandbox.io/p/sandbox/5w35n6"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Poimandres
            </a>
          </div>
        </div>
      )}
      <div
        className={`h-screen flex flex-col items-center justify-center px-4 ${
          isMobile ? "col-span-2" : ""
        }`}
      >
        {searchParams.get("verification") === "done" && (
          <div className="absolute top-10 flex mx-8 p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
            <CheckIcon /> Email successfully verified. You can now sign in.
          </div>
        )}

        {searchParams.get("reset") === "done" && (
          <div className="absolute top-10 flex mx-8 p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
            <CheckIcon /> Your password has been changed. You can now sign in
            with your new password.
          </div>
        )}

        <div className="grow"></div>
        {isMobile && (
          <>
            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-20 fill-current"
              role="presentation"
            />
          </>
        )}
        <Outlet />
        <div className="grow flex flex-row justify-center items-end gap-4 pb-5 text-xs">
          {org?.imprintUrl && (
            <a href={org.imprintUrl} target="_blank" rel="noopener noreferrer">
              Imprint
            </a>
          )}
          {org?.privacyUrl && (
            <a href={org.privacyUrl} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
