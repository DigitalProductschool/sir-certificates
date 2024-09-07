import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import type { Template } from "@prisma/client";
import { useState, useEffect } from "react";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  useNavigate,
  useParams,
  useMatches,
} from "@remix-run/react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { requireUserId } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = `${data.program?.name} Templates`;
  return [{ title }, { name: "description", content: "Welcome to Remix!" }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUserId(request);

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
    include: {
      templates: true,
    },
  });

  if (!program) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  return json({ program });
};

export const handle = {
  breadcrumb: () => <Link to="#">Templates</Link>,
};

export default function ProgramPage() {
  const { program } = useLoaderData<typeof loader>();
  const [templateName, setTemplateName] = useState("");
  const [openAddDialog, setOpenAddDialog] = useState(false);

  const params = useParams();
  const navigate = useNavigate();
  const matches = useMatches();

  const firstTemplate =
    program.templates.length > 0 ? program.templates[0] : undefined;

  const handleTemplateSelect = (value: string) => {
    navigate(`/org/program/${program.id}/templates/${value}`);
  };

  useEffect(() => {
    // IF at least one template exists AND we're on program level THEN navigate to the first template
    if (firstTemplate && matches.length === 4) {
      navigate(`/org/program/${program.id}/templates/${firstTemplate.id}`, {
        replace: true,
      });
    }
  }, [program.id, matches, firstTemplate, navigate]);

  // @todo reset form inputs after adding a new template, see https://www.youtube.com/watch?v=bMLej7bg5Zo&list=PLXoynULbYuEDG2wBFSZ66b85EIspy3fy6

  // @todo reduce layout shifts by setting a size (or aspect ratio?) for the preview image and/or the layout

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {program.templates.length > 0 ? (
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
        ) : (
          <p>No templates created yet</p>
        )}
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline">Add Template</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <Form
              action="create"
              method="POST"
              encType="multipart/form-data"
              onSubmit={() => {
                setOpenAddDialog(false);
              }}
            >
              <DialogHeader>
                <DialogTitle>Add template</DialogTitle>
                <DialogDescription>
                  Upload a new certificate template for this program, then
                  configure the layout options in the next step.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Label htmlFor="pdf">Select a PDF file</Label>
                <Input
                  id="pdf"
                  name="pdf"
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      let filename = e.target.files[0].name;
                      if (filename.lastIndexOf(".") > 0) {
                        filename = filename.substring(
                          0,
                          filename.lastIndexOf("."),
                        );
                      }
                      setTemplateName(filename);
                    }
                  }}
                />
                <Label htmlFor="name">Template name</Label>
                <Input
                  id="name"
                  name="name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <Label htmlFor="locale">Date format</Label>
                <Select name="locale" defaultValue="de-DE">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de-DE">German</SelectItem>
                    <SelectItem value="en-GB">English UK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">Upload PDF</Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <Outlet />
    </div>
  );
}
