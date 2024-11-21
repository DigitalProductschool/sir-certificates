import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Typeface } from "@prisma/client";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";

import { Trash2Icon } from "lucide-react";

import { Button } from "~/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

const mapFontWeight: Record<number, string> = {
  200: "Light",
  400: "Regular",
  700: "Bold",
};

function capitalizeFirst(string: string) {
  return string[0].toUpperCase() + string.slice(1);
}

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: "Typefaces" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireAdmin(request);

  const typefaces = await prisma.typeface.findMany({
    orderBy: [
      {
        name: "asc",
      },
    ],
  });

  return json({ typefaces });
};

type Match = {
  id: string;
  pathname: string;
  data: typeof loader;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) => <Link to={match.pathname}>Typefaces</Link>,
};

export default function TypefaceIndexPage() {
  const { typefaces } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild>
          <Link to="create">Add Typeface</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-medium">Name</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Style</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {typefaces.map((tf: Typeface) => (
            <TableRow key={tf.id}>
              <TableCell className="font-medium">{tf.name}</TableCell>
              <TableCell>{mapFontWeight[tf.weight]}</TableCell>
              <TableCell className={tf.style === "italic" ? "italic" : ""}>
                {capitalizeFirst(tf.style)}
              </TableCell>
              <TableCell>
                <Form action={`${tf.id}/delete`} method="POST">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="submit" variant="outline" size="icon">
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete typeface</TooltipContent>
                  </Tooltip>
                </Form>
              </TableCell>
            </TableRow>
          ))}
          {typefaces.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-destructive">
                No typefaces in the database. Please upload a font file.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
