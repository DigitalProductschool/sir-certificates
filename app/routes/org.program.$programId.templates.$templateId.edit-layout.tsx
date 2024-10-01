import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
  ErrorResponse,
} from "@remix-run/node";
import type { Template } from "@prisma/client";
import { useEffect, useState } from "react";
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

import { EyeIcon, Brackets } from "lucide-react";

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
import { Textarea } from "~/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

import { LayoutEditor } from "~/components/layout-editor";

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

  const typefaces = await prisma.typeface.findMany();

  return json({ template, typefaces });
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
  const { template, typefaces } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [layout, setLayout] = useState(template.layout);
  const [switchEditor, setSwitchEditor] = useState("visual");

  return (
    <div className="pt-2 grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex h-10 items-center gap-1.5">
          <ToggleGroup
            type="single"
            value={switchEditor}
            onValueChange={setSwitchEditor}
          >
            <ToggleGroupItem
              value="visual"
              aria-label="Toggle visual editor"
              className="data-[state=on]:text-primary data-[state=off]:text-muted-foreground"
            >
              <EyeIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="code"
              aria-label="Toggle code editor"
              className="data-[state=on]:text-primary data-[state=off]:text-muted-foreground"
            >
              <Brackets className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>{" "}
          <Label className="grow">Layout Editor</Label>
          <Form key={template.id} method="POST">
            <input type="hidden" name="layout" value={JSON.stringify(layout)} />
            <Button type="submit" disabled={navigation.state !== "idle"}>
              Save and Preview
            </Button>
          </Form>
        </div>
        {switchEditor === "visual" ? (
          <LayoutEditor
            layout={layout}
            fonts={typefaces}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            onChange={(updatedLayout: any) => setLayout(updatedLayout)}
          />
        ) : (
          <Textarea
            className="font-mono min-h-96 h-full"
            value={JSON.stringify(layout, undefined, 2)}
            onChange={(event) => {
              const layoutJSON = JSON.parse(event.target.value);
              setLayout(layoutJSON);
            }}
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label className="flex grow h-10 justify-center items-center">
          Template Preview
        </Label>

        <img
          className="drop-shadow-xl self-center"
          src={`preview.png?t=${template.updatedAt}`}
          alt="Preview of the template"
        />
      </div>
    </div>
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

  const backLink = `/org/program/${params.programId}/templates/${params.templateId}/edit-layout`;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate(backLink);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate, backLink]);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(backLink);
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
              navigate(backLink);
            }}
          >
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
