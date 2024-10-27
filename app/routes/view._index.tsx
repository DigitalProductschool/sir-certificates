import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Certificates" }];
};

// @todo improve this view

export default function Index() {
  return (
    <div className="flex flex-col items-center h-dvh overflow-auto p-16 md:p-24 lg:p-32 gap-4 bg-muted">
      No certificate selected
    </div>
  );
}
