import { Fragment } from "react";
import { useMatches } from "@remix-run/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

export function Breadcrumbs() {
  const matches = useMatches();

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        {matches
          .filter((match) => match.handle && match.handle.breadcrumb)
          .map((match, index) => (
            <Fragment key={index}>
              {index != 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  {match.handle.breadcrumb(match)}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
