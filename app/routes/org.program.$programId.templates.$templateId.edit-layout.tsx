import type { Route } from "./+types/org.program.$programId.templates.$templateId.edit-layout";
import type { ErrorResponse } from "react-router";
import { useEffect, useState } from "react";
import {
  Form,
  useParams,
  useNavigate,
  useNavigation,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

import {
  generateTemplateSample,
  generatePreviewOfTemplate,
  sampleQR,
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
import { LayoutQRCodeEditor } from "~/components/layout-qrcode-editor";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `Template ${data?.template?.name}` }];
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const inputs = Object.fromEntries(formData) as { [k: string]: string };
  let layoutJSON;
  let qrJSON;

  // @todo verify schema of incoming JSON
  try {
    layoutJSON = JSON.parse(inputs.layout);
  } catch (error) {
    throw new Response(null, {
      status: 400,
      statusText: "Invalid JSON layout",
    });
  }

  // @todo verify schema of incoming JSON
  try {
    qrJSON = JSON.parse(inputs.qrcode);
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
        programId: Number(params.programId),
      },
      data: {
        layout: layoutJSON,
        qrcode: qrJSON,
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

  return { template };
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const template = await prisma.template.findUnique({
    where: {
      id: Number(params.templateId),
      programId: Number(params.programId),
    },
  });

  if (!template) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  /* Temporarily needed until all templates have QR code settings
     @todo ensure all templates have or get a qrcode settings declaration and then update the schema to make it non-optional
  */
  if (template && template.qrcode === null) {
    template.qrcode = sampleQR;
  }

  const typefaces = await prisma.typeface.findMany();

  return { template, typefaces };
}

export default function TemplateEditorPage({
  loaderData,
}: Route.ComponentProps) {
  const { template, typefaces } = loaderData;
  const navigation = useNavigation();
  const [layout, setLayout] = useState(template.layout);
  const [qrcode, setQrcode] = useState(template.qrcode);
  const [switchEditor, setSwitchEditor] = useState("visual");

  useEffect(() => {
    setLayout(template.layout);
  }, [template.id, template.layout]);

  // @todo – when editing the template in JSON code,
  // allow for a graceful handling of JSON syntax errors instead of preventing edits

  return (
    <div className="pt-2 grid grid-cols-2 gap-4 items-start">
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
              <EyeIcon />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="code"
              aria-label="Toggle code editor"
              className="data-[state=on]:text-primary data-[state=off]:text-muted-foreground"
            >
              <Brackets />
            </ToggleGroupItem>
          </ToggleGroup>{" "}
          <Label className="grow">Layout Editor</Label>
          <Form key={template.id} method="POST">
            <input type="hidden" name="layout" value={JSON.stringify(layout)} />
            <input type="hidden" name="qrcode" value={JSON.stringify(qrcode)} />
            <Button type="submit" disabled={navigation.state !== "idle"}>
              Save and Preview
            </Button>
          </Form>
        </div>

        {switchEditor === "visual" ? (
          <>
            <LayoutEditor
              layout={layout}
              fonts={typefaces}
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
              onChange={(updatedLayout: any) => setLayout(updatedLayout)}
            />
            <LayoutQRCodeEditor qrcode={qrcode} onChange={setQrcode} />
          </>
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
