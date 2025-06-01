import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Template } from "@prisma/client";
import { useEffect } from "react";
import {
  Link,
  Outlet,
  useLoaderData,
  useNavigate,
  useParams,
  useMatches,
} from "@remix-run/react";

import { Settings } from "lucide-react";

import { Button } from "~/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `${data.program?.name} Templates` }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request); // program access is managed at the parent route

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
    include: {
      templates: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!program) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return { program };
};

export default function ProgramTemplatesPage() {
  const { program } = useLoaderData<typeof loader>();

  const params = useParams();
  const navigate = useNavigate();
  const matches = useMatches();

  const firstTemplate =
    program.templates.length > 0 ? program.templates[0] : undefined;

  const handleTemplateSelect = (value: string) => {
    navigate(`/org/program/${program.id}/templates/${value}/edit-layout`);
  };

  useEffect(() => {
    // IF at least one template exists AND we're on program level THEN navigate to the first template
    if (firstTemplate && matches.length === 4) {
      navigate(
        `/org/program/${program.id}/templates/${firstTemplate.id}/edit-layout`,
        {
          replace: true,
        },
      );
    }
  }, [program.id, matches, firstTemplate, navigate]);

  // @todo reduce layout shifts by setting a size (or aspect ratio?) for the preview image and/or the layout

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        {program.templates.length > 0 && (
          <Select
            key={params.templateId}
            defaultValue={params.templateId}
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {program.templates.map((template: Template) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {params.templateId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" asChild>
                <Link
                  to={`${params.templateId}/edit-meta`}
                  aria-label="Edit template settings"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Edit template settings</TooltipContent>
          </Tooltip>
        )}

        {params.templateId && (
          <Button variant="outline" asChild>
            <Link to={`${params.templateId}/duplicate`}>
              Duplicate template
            </Link>
          </Button>
        )}

        <Button variant="outline" asChild>
          <Link to="create">Add Template</Link>
        </Button>
      </div>

      {program.templates.length === 0 && (
        <p>
          Certificates are based on PDF templates. Start by uploading your first
          PDF template.
        </p>
      )}

      <Outlet />
    </div>
  );
}
