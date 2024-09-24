import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
  ErrorResponse,
} from "@remix-run/node";
import type { Template } from "@prisma/client";
import { useEffect } from "react";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useParams,
  useNavigate,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import { requireAdmin } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  generateTemplateSample,
  generatePreviewOfTemplate,
} from "~/lib/pdf.server";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = `Template ${data?.template?.name}`;
  return [{ title }];
};

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData);
  let layoutJSON;

  try {
    layoutJSON = JSON.parse(inputs.layout);
  } catch (error) {
    throw new Response(null, {
      status: 400,
      statusText: "Invalid JSON layout",
    });
  }

  // If this email exists already for this batch, update instead of create
  const template = await prisma.template
    .update({
      where: {
        id: Number(params.templateId),
      },
      data: {
        layout: layoutJSON,
        name: inputs.name,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not update template");
    });

  if (template) {
    await generateTemplateSample(template);
    await generatePreviewOfTemplate(template, false);
  }

  return json({ template });
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
    },
  });

  if (!template) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ template });
};

type LoaderReturnType = {
  template: Template;
};

type Match = {
  id: string;
  pathname: string;
  data: LoaderReturnType;
  params: Record<string, string>;
};

export const handle = {
  breadcrumb: (match: Match) => (
    <Link to="#">Template: {match.data?.template?.name}</Link>
  ),
};

export default function TemplateEditorPage() {
  const { template } = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  return (
    <>
      <Form key={template.id} method="POST" className="pt-4">
        <div className="grid grid-cols-2 gap-4">
          <Label htmlFor="name">Template name</Label>
          <Label htmlFor="locale">Date format</Label>
          <Input id="name" name="name" defaultValue={template.name} />
          <div className="grid grid-cols-2 gap-4">
            <Select name="locale" defaultValue={template.locale}>
              <SelectTrigger id="locale">
                <SelectValue placeholder="Select a date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de-DE">German</SelectItem>
                <SelectItem value="en-GB">English UK</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={navigation.state !== "idle"}>
              Save and update preview
            </Button>
          </div>

          <Textarea
            name="layout"
            className="font-mono"
            defaultValue={JSON.stringify(template.layout, undefined, 2)}
          />

          <img
            className="drop-shadow-xl self-center"
            src={`${template.id}/preview.png?t=${template.updatedAt}`}
            alt="Preview of the template"
          />
        </div>
      </Form>
      <Form action="delete" method="POST">
        <Button type="submit" variant="destructive">
          Delete Template
        </Button>
      </Form>
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const params = useParams();
  const navigate = useNavigate();
  console.error(error);

  let additionalInfo = "";
  if (isRouteErrorResponse(error)) {
    const routeError = error as ErrorResponse;
    /* if (routeError.statusText) {
      additionalInfo = routeError.statusText;
    } */
    if (routeError.data) {
      additionalInfo = routeError.data;
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(
          `/org/program/${params.programId}/templates/${params.templateId}`,
        );
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open)
          navigate(
            `/org/program/${params.programId}/templates/${params.templateId}`,
          );
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
          <DialogDescription>
            The template could not be saved.
            <br />
            {additionalInfo}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              navigate(
                `/org/program/${params.programId}/templates/${params.templateId}`,
              );
            }}
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
