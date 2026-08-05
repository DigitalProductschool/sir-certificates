import type { Route } from "./+types/org.program.$programId.social";
import { type ChangeEvent, useRef, useState } from "react";
import { Form, useFetcher } from "react-router";
import { ImageUp, Paintbrush, TriangleAlert, Trash2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { InputTiny } from "~/components/ui/input-tiny";
import { FormUpdate } from "~/components/form-update";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getSampleBatch, getSampleCertificate } from "~/lib/sample-data";
import { defaultOgDescription, defaultOgTitle } from "~/lib/social-defaults";
import { defaultLayout } from "~/lib/social.server";
import { replaceVariables } from "~/lib/text-utils";

function calculateCertificateHeight(width: number, top: number) {
  let h = Math.round(width * 1.415);
  if (top + h > 630) {
    h = 630 - top;
  }
  return h;
}

export function meta() {
  return [{ title: "Social Preview" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminWithProgram(request, Number(params.programId));

  // @todo refactor to program route loader to avoid duplicate data loading
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

  // If layout was not initialized yet, return the default layout
  let layout = social?.layout;
  if (!layout || !layout.photo || !layout.certificate) {
    layout = defaultLayout;
  }

  return {
    program,
    social,
    socialLayout: layout,
    sampleCertificate: getSampleCertificate(),
    sampleBatch: getSampleBatch(),
  };
}

export default function ProgramSocialPage({
  loaderData,
}: Route.ComponentProps) {
  const { program, social, socialLayout, sampleCertificate, sampleBatch } =
    loaderData;
  const fetcherImage = useFetcher({ key: "social-image" });
  const fetcherLayout = useFetcher({ key: "social-layout" });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewWithPhoto, setPreviewWithPhoto] = useState(true);
  const [prevSocialLayout, setPrevSocialLayout] = useState(socialLayout);
  const [layout, setLayout] = useState(socialLayout);
  if (socialLayout !== prevSocialLayout) {
    setPrevSocialLayout(socialLayout);
    setLayout(socialLayout);
  }
  const [ogTitle, setOgTitle] = useState(social?.ogTitle ?? defaultOgTitle);
  const [ogDescription, setOgDescription] = useState(
    social?.ogDescription ?? defaultOgDescription,
  );

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleFileChanged = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      fetcherImage.submit(event.currentTarget.form, {
        method: "POST",
        encType: "multipart/form-data",
      });
      window.setTimeout(() => {
        event.target.value = "";
      }, 100);
    }
  };

  return (
    <div className="h-full flex flex-col justify-center items-start gap-4">
      {social && (
        <Form action="delete" method="POST">
          <Button variant="outline" type="submit">
            <Trash2 /> Remove Social Preview
          </Button>
        </Form>
      )}
      <div className="grid grid-cols-[auto_auto] gap-4">
        <section className="col-span-2 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">OpenGraph Metadata</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-[650px]">
              The title and description are shown when a certificate is shared
              on social media. You can use variables like{" "}
              <code>{"{certificate.fullName}"}</code> or{" "}
              <code>{"{program.name}"}</code> to personalise the text.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ogTitle">OpenGraph title</Label>
            <FormUpdate action="update">
              <Input
                id="ogTitle"
                name="ogTitle"
                defaultValue={social?.ogTitle ?? defaultOgTitle}
                className="max-w-[650px]"
                onChange={(event) => setOgTitle(event.target.value)}
              />
            </FormUpdate>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ogDescription">OpenGraph description</Label>
            <FormUpdate action="update">
              <Textarea
                id="ogDescription"
                name="ogDescription"
                defaultValue={social?.ogDescription ?? defaultOgDescription}
                className="max-w-[650px]"
                onChange={(event) => setOgDescription(event.target.value)}
              />
            </FormUpdate>
          </div>
        </section>
        <Card className="max-w-[650px]">
          <CardHeader>
            <CardTitle className="text-xl">
              {replaceVariables(
                ogTitle,
                "en-US",
                sampleCertificate,
                sampleBatch,
                program,
              )}
            </CardTitle>
            <CardDescription>
              {replaceVariables(
                ogDescription,
                "en-US",
                sampleCertificate,
                sampleBatch,
                program,
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!social ? (
              <div className="w-full max-w-[600px] aspect-[1.91/1] flex border border-dashed border-slate-500 justify-center items-center bg-muted p-8">
                Please upload the background layer for the social media preview.
                Image formats PNG and JPEG are supported. Image size should be
                1200 x 630 pixels.
              </div>
            ) : (
              <img
                src={`social/preview.png?t=${social.updatedAt}${
                  previewWithPhoto ? "&withPhoto=1" : ""
                }`}
                className="w-full max-w-[600px] aspect-[1.91/1]"
                alt="Social media preview for shared certificates"
              />
            )}
          </CardContent>
        </Card>
        <section className="flex flex-col gap-6 pt-4">
          <fetcherImage.Form
            method="POST"
            action="upload"
            encType="multipart/form-data"
          >
            <input
              type="file"
              name="backgroundImage"
              accept="image/png, image/jpeg"
              ref={fileRef}
              hidden
              onChange={handleFileChanged}
            />
            <Button
              type="button"
              onClick={handleUploadClick}
              disabled={fetcherImage.state !== "idle"}
            >
              <ImageUp />
              {social ? "Replace" : "Upload"} background image
            </Button>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {" "}
              1200x630 pixel, PNG or JPEG
            </p>
          </fetcherImage.Form>
          {social &&
            (social.imageWidth == null || social.imageHeight == null) && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                title="Image dimensions are missing for this background. Click 'Update layout' to fix this without re-uploading."
              >
                <TriangleAlert />
                Missing dimensions in database.
                <br />
                Click update layout to fix.
              </Badge>
            )}
          <div className="flex flex-row justify-between items-center">
            <Label htmlFor="previewWithPhoto">Preview with Photo</Label>
            <Switch
              id="previewWithPhoto"
              checked={previewWithPhoto}
              onCheckedChange={setPreviewWithPhoto}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Photo position</Label>
            <div className="flex flex-row gap-2">
              <InputTiny
                label="X"
                tooltip="X position (in pixel) from left"
                inputMode="numeric"
                value={layout.photo.x}
                onChange={(event) => {
                  const photo = {
                    ...layout.photo,
                    x: Number(event.target.value),
                  };
                  const update = { ...layout, photo };
                  setLayout(update);
                }}
              />
              <InputTiny
                label="Y"
                tooltip="Y position (in pixel) from top"
                inputMode="numeric"
                value={layout.photo.y}
                onChange={(event) => {
                  const photo = {
                    ...layout.photo,
                    y: Number(event.target.value),
                  };
                  const update = { ...layout, photo };
                  setLayout(update);
                }}
              />
              <InputTiny
                label="W"
                tooltip="Width and height (in pixel)"
                inputMode="numeric"
                value={layout.photo.size}
                onChange={(event) => {
                  const photo = {
                    ...layout.photo,
                    size: Number(event.target.value),
                  };
                  const update = { ...layout, photo };
                  setLayout(update);
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Certificate position (with photo)</Label>
            <div className="flex flex-row gap-2">
              <InputTiny
                label="X"
                tooltip="X position (in pixel) from left"
                inputMode="numeric"
                value={layout.certificate.withPhoto.x}
                onChange={(event) => {
                  const withPhoto = {
                    ...layout.certificate.withPhoto,
                    x: Number(event.target.value),
                  };
                  const certificate = { ...layout.certificate, withPhoto };
                  const update = { ...layout, certificate };
                  setLayout(update);
                }}
              />
              <InputTiny
                label="Y"
                tooltip="Y position (in pixel) from top"
                inputMode="numeric"
                value={layout.certificate.withPhoto.y}
                onChange={(event) => {
                  const withPhoto = {
                    ...layout.certificate.withPhoto,
                    y: Number(event.target.value),
                    h: calculateCertificateHeight(
                      layout.certificate.withPhoto.w,
                      Number(event.target.value),
                    ),
                  };
                  const certificate = { ...layout.certificate, withPhoto };
                  const update = { ...layout, certificate };
                  setLayout(update);
                }}
              />
              <InputTiny
                label="W"
                tooltip="Width (in pixel)"
                inputMode="numeric"
                value={layout.certificate.withPhoto.w}
                onChange={(event) => {
                  const withPhoto = {
                    ...layout.certificate.withPhoto,
                    w: Number(event.target.value),
                    h: calculateCertificateHeight(
                      Number(event.target.value),
                      layout.certificate.withPhoto.y,
                    ),
                  };
                  const certificate = { ...layout.certificate, withPhoto };
                  const update = { ...layout, certificate };
                  setLayout(update);
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Certificate position (without photo)</Label>
            <div className="flex flex-row gap-2">
              <InputTiny
                label="X"
                tooltip="X position (in pixel) from left"
                inputMode="numeric"
                value={layout.certificate.noPhoto.x}
                onChange={(event) => {
                  const noPhoto = {
                    ...layout.certificate.noPhoto,
                    x: Number(event.target.value),
                  };
                  const certificate = { ...layout.certificate, noPhoto };
                  const update = { ...layout, certificate };
                  setLayout(update);
                }}
              />
              <InputTiny
                label="Y"
                tooltip="Y position (in pixel) from top"
                inputMode="numeric"
                value={layout.certificate.noPhoto.y}
                onChange={(event) => {
                  const noPhoto = {
                    ...layout.certificate.noPhoto,
                    y: Number(event.target.value),
                    h: calculateCertificateHeight(
                      layout.certificate.noPhoto.w,
                      Number(event.target.value),
                    ),
                  };
                  const certificate = { ...layout.certificate, noPhoto };
                  const update = { ...layout, certificate };
                  setLayout(update);
                }}
              />
              <InputTiny
                label="W"
                tooltip="Width (in pixel)"
                inputMode="numeric"
                value={layout.certificate.noPhoto.w}
                onChange={(event) => {
                  const noPhoto = {
                    ...layout.certificate.noPhoto,
                    w: Number(event.target.value),
                    h: calculateCertificateHeight(
                      Number(event.target.value),
                      layout.certificate.noPhoto.y,
                    ),
                  };
                  const certificate = { ...layout.certificate, noPhoto };
                  const update = { ...layout, certificate };
                  setLayout(update);
                }}
              />
            </div>
          </div>

          <fetcherLayout.Form
            method="POST"
            action="update"
            className="flex flex-col"
          >
            <input type="hidden" name="layout" value={JSON.stringify(layout)} />
            <Button type="submit" disabled={fetcherLayout.state !== "idle"}>
              <Paintbrush />
              Update layout
            </Button>
          </fetcherLayout.Form>
        </section>
      </div>
    </div>
  );
}
