import type { Route } from "./+types/org.typeface._index";
import type { Typeface } from "~/generated/prisma/client";
import { Form, Link } from "react-router";

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

import { requireSuperAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

const mapFontWeight: Record<number, string> = {
  200: "Light",
  400: "Regular",
  700: "Bold",
};

function capitalizeFirst(string: string) {
  return string[0].toUpperCase() + string.slice(1);
}

export function meta() {
  return [{ title: "Typefaces" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);

  const typefaces = await prisma.typeface.findMany({
    orderBy: [
      {
        name: "asc",
      },
    ],
  });

  return { typefaces };
}

export default function TypefaceIndexPage({
  loaderData,
}: Route.ComponentProps) {
  const { typefaces } = loaderData;

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
            <TableHead>Actions</TableHead>
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
                      <Button type="submit" variant="outline">
                        <Trash2Icon /> Delete
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
