import type { Route } from "./+types/org.program.$programId.batch.$batchId.certificates.$certId.edit";
import type { Template } from "~/generated/prisma/client";
import { useState } from "react";
import { Form, redirect, useNavigate, useNavigation } from "react-router";
import {
  getFormProps,
  getInputProps,
  getSelectProps,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";

import { LoaderCircle, Trash2Icon } from "lucide-react";
import { FormField } from "~/components/form-field";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
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

import { requireAdminWithProgram } from "~/lib/auth.server";
import {
  generateCertificate,
  generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import {
  prisma,
  PrismaClientKnownRequestError,
  throwErrorResponse,
} from "~/lib/prisma.server";
import { CertificateInputSchema as schema } from "~/lib/schemas";

export function meta() {
  return [{ title: "Edit Certificate" }];
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  // Send the submission back to the client if the status is not successful
  if (submission.status !== "success") {
    return submission.reply();
  }

  const inputs = submission.value;
  let dbError: string | null = null;

  const certificate = await prisma.certificate
    .update({
      where: {
        id: Number(params.certId),
        batch: {
          is: {
            programId: Number(params.programId),
          },
        },
      },
      data: {
        firstName: inputs.firstName,
        lastName: inputs.lastName,
        email: inputs.email,
        teamName: inputs.teamName,
        template: {
          connect: { id: Number(inputs.templateId) },
        },
      },
      include: {
        batch: true,
        template: true,
      },
    })
    .catch((error) => {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002" /* for now this is a special case */
      ) {
        dbError = error.code;
        return;
      } else {
        console.error(error);
        throwErrorResponse(error, "Could not update certificate");
      }
    });

  if (!certificate && dbError !== null) {
    if (dbError === "P2002") {
      return submission.reply({
        fieldErrors: {
          email: [
            "There is already a certificate with this email in the batch.",
          ],
        },
      });
    }
  }

  if (certificate) {
    const skipIfExists = false;
    await generateCertificate(
      certificate.batch,
      certificate,
      certificate.template,
      skipIfExists,
    );
    await generatePreviewOfCertificate(certificate, skipIfExists);
  }

  return redirect(
    `/org/program/${params.programId}/batch/${params.batchId}/certificates#c${params.certId}`,
  );
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  const certificate = await prisma.certificate.findUnique({
    where: {
      id: Number(params.certId),
      batch: {
        is: {
          programId: Number(params.programId),
        },
      },
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const templates = await prisma.template.findMany({
    where: {
      program: {
        is: {
          id: {
            equals: Number(params.programId),
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return { certificate, templates };
}

export default function EditCertificateDialog({
  actionData,
  loaderData,
  params,
}: Route.ComponentProps) {
  const { certificate, templates } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();

  const [templateId, setTemplateId] = useState(
    certificate.templateId.toString(),
  );

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(schema),
    defaultValue: certificate,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema,
      });
    },
  });

  const isSubmitting =
    navigation.formAction ===
    `/org/program/${params.programId}/batch/${params.batchId}/certificates/${params.certId}/edit`;

  function handleOpenChange(open: boolean) {
    if (!open) navigate(-1);
  }

  // @todo figure out a better way to preserve view state (grid or table) and preserve it across form submission

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] grid grid-cols-1 sm:grid-cols-2 gap-12">
        <div className="bg-muted -m-6 rounded-l-lg hidden sm:block">
          <div className="w-full p-6 aspect-[1/1.38]">
            {templateId && (
              <img
                className="drop-shadow-xl self-center"
                src={`/org/program/${params.programId}/templates/${templateId}/preview.png?t=${new Date()}`} // &${preview}
                alt="Preview of the template"
              />
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <DialogHeader>
            <DialogTitle>Certificate settings</DialogTitle>
            <DialogDescription>
              Change the certificate information as needed.
            </DialogDescription>
          </DialogHeader>
          <Form
            method="POST"
            className="grid gap-2 py-4"
            {...getFormProps(form)}
          >
            <div className="flex flex-col gap-1 mb-8">
              <Label htmlFor="templateId">Template</Label>
              <Select
                {...getSelectProps(fields.templateId)}
                defaultValue={certificate.templateId.toString()}
                onValueChange={setTemplateId}
              >
                <SelectTrigger
                  aria-invalid={
                    getSelectProps(fields.templateId)["aria-invalid"]
                  }
                >
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: Template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id.toString()}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fields.templateId.errors && (
                <div className="text-xs font-semibold text-red-500 w-full">
                  {fields.templateId.errors.join(", ")}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <FormField
                {...getInputProps(fields.firstName, { type: "text" })}
                label="First name"
                error={""}
              />
              <FormField
                {...getInputProps(fields.lastName, { type: "text" })}
                label="Last name"
                error={fields.lastName.errors?.join(", ")}
              />
            </div>
            <div
              id={fields.firstName.errorId}
              className="-mt-3 mb-2 text-xs font-semibold text-red-500"
            >
              {fields.firstName.errors}
            </div>

            <FormField
              {...getInputProps(fields.email, { type: "email" })}
              label="Email"
              error={fields.email.errors?.join(", ")}
            />
            <FormField
              {...getInputProps(fields.teamName, { type: "text" })}
              label="Team"
              error={fields.teamName.errors?.join(", ")}
            />
            <div id={form.errorId}>{form.errors}</div>
          </Form>
          <div className="flex-grow" />
          <DialogFooter>
            <Form
              action={`../${certificate.id}/delete`}
              method="POST"
              className="flex grow"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="submit" variant="destructive" size="icon">
                    <Trash2Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Delete this certificate
                </TooltipContent>
              </Tooltip>
            </Form>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" form={form.id} disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
