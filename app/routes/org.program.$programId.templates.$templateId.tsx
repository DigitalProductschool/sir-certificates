import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import {
  generateTemplateSample,
  generatePreviewOfTemplate,
} from "~/lib/pdf.server";

import { Button } from "~/components/ui/button";

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
  const title = `Template ${data.template?.name}`;
  return [{ title }, { name: "description", content: "Welcome to Remix!" }];
};

export const action: ActionFunction = async ({ request, params }) => {
  // @todo require admin user
  await requireUserId(request);

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
  await requireUserId(request);

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

export const handle = {
  breadcrumb: () => <Link to="#">Templates</Link>,
};

export default function ProgramPage() {
  const { template } = useLoaderData<typeof loader>();

  return (
    <>
      <Form key={template.id} method="POST" className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input name="name" defaultValue={template.name} />
          <div className="grid grid-cols-2 gap-4">
            <Select name="locale" defaultValue={template.locale}>
              <SelectTrigger>
                <SelectValue placeholder="Select a date format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="de-DE">German</SelectItem>
                <SelectItem value="en-GB">English UK</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Save and update preview</Button>
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
