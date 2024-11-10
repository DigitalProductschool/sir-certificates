import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { ChangeEvent, useRef, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { ImageUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

import { requireAdmin } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";

export const meta: MetaFunction<typeof loader> = () => {
  const title = "Social Preview";
  return [{ title }];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireAdmin(request);

  const program = await prisma.program.findUnique({
    where: {
      id: Number(params.programId),
    },
  });

  if (!program) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: Number(params.programId),
    },
  });

  return json({ program, social });
};

export default function ProgramSocialPage() {
  const { program, social } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewWithPhoto, setPreviewWithPhoto] = useState(true);

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleFileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      //formRef.current?.submit();
      fetcher.submit(event.currentTarget.form, {
        method: "POST",
        encType: "multipart/form-data",
      });
    }
  };

  return (
    <div className="h-full flex flex-row justify-center items-center">
      <div className="flex flex-row gap-4">
        <Card className="max-w-[650px]">
          <CardHeader>
            <CardTitle className="text-xl">
              Firstname Lastname is certified by {program.name}
            </CardTitle>
            <CardDescription>{program.achievement ?? ""}</CardDescription>
          </CardHeader>
          <CardContent>
            {!social ? (
              <div className="w-full max-w-[600px] aspect-[1.91/1] flex border border-dashed border-slate-500 justify-center items-center bg-muted"></div>
            ) : (
              <img
                src={`social/preview.png?t=${social.updatedAt}${previewWithPhoto ? "&withPhoto=1" : ""}`}
                className="w-full max-w-[600px] aspect-[1.91/1]"
                alt="Social media preview for shared certificates"
              />
            )}
          </CardContent>
          <CardFooter></CardFooter>
        </Card>
        <Card>
          <CardHeader></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <fetcher.Form
              method="POST"
              action="upload"
              ref={formRef}
              encType="multipart/form-data"
            >
              <input
                type="file"
                name="backgroundImage"
                ref={fileRef}
                hidden
                onChange={handleFileChanged}
              />
              <Button type="button" onClick={handleUploadClick}>
                <ImageUp />
                Upload background image
              </Button>
            </fetcher.Form>
            <div className="flex flex-row justify-between">
              <Label htmlFor="previewWithPhoto">Preview with Photo</Label>
              <Switch
                id="previewWithPhoto"
                checked={previewWithPhoto}
                onCheckedChange={setPreviewWithPhoto}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
