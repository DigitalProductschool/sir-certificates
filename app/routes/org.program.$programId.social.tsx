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
import { VariableMenu } from "~/components/variable-menu";

import { useVariableInsertion } from "~/hooks/use-variable-insertion";
import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { getSampleBatch, getSampleCertificate } from "~/lib/sample-data";
import { defaultOgDescription, defaultOgTitle } from "~/lib/social-defaults";
import { defaultLayout } from "~/lib/social.server";
import {
  replaceVariables,
  SOCIAL_PREVIEW_VARIABLE_GROUPS,
} from "~/lib/variables";

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

  const social = await prisma.socialPreview.findUniqueOrThrow({
    where: {
      programId: Number(params.programId),
    },
  });

  // If layout was not initialized yet, return the default layout
  let layout = social.layout;
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
  const [ogTitle, setOgTitle] = useState(social.ogTitle ?? defaultOgTitle);
  const [ogDescription, setOgDescription] = useState(
    social.ogDescription ?? defaultOgDescription,
  );

  const {
    fieldRef: ogTitleFieldRef,
    trackingProps: ogTitleTrackingProps,
    insertAtCursor: insertAtOgTitleCursor,
    restoreFocus: restoreOgTitleFocus,
  } = useVariableInsertion<HTMLInputElement>();
  const {
    fieldRef: ogDescriptionFieldRef,
    trackingProps: ogDescriptionTrackingProps,
    insertAtCursor: insertAtOgDescriptionCursor,
    restoreFocus: restoreOgDescriptionFocus,
  } = useVariableInsertion<HTMLTextAreaElement>();

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
      <div className="grid grid-cols-[auto_auto] gap-8">
        <section className="col-span-2 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">LinkedIn</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-[650px]">
              Certificate owners can add this achievement to their LinkedIn
              profile. If this program&apos;s certificates are issued under a
              LinkedIn Company Page, enter its numeric ID below — find it in the
              page&apos;s admin URL (
              <code>linkedin.com/company/&lt;id&gt;/admin</code>
              ). Leave blank to show your organisation&apos;s name instead.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="linkedinOrganizationId">
              LinkedIn Organization Page ID
            </Label>
            <FormUpdate action="update">
              <Input
                id="linkedinOrganizationId"
                name="linkedinOrganizationId"
                defaultValue={social.linkedinOrganizationId ?? ""}
                className="max-w-[650px]"
                inputMode="numeric"
                pattern="[0-9]*"
                title="Only the numeric page ID, e.g. 12345678"
              />
            </FormUpdate>
          </div>
        </section>
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
            <div className="flex items-center justify-between max-w-[650px]">
              <Label htmlFor="ogTitle">OpenGraph title</Label>
              <VariableMenu
                groups={SOCIAL_PREVIEW_VARIABLE_GROUPS}
                triggerSize="icon-sm"
                onInsert={(placeholder) => {
                  const el = ogTitleFieldRef.current;
                  if (el) {
                    insertAtOgTitleCursor(el.value, `{${placeholder}}`);
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                  }
                }}
                onClose={restoreOgTitleFocus}
              />
            </div>
            <FormUpdate action="update">
              <Input
                id="ogTitle"
                name="ogTitle"
                ref={ogTitleFieldRef}
                defaultValue={social.ogTitle ?? defaultOgTitle}
                className="max-w-[650px]"
                onChange={(event) => setOgTitle(event.target.value)}
                {...ogTitleTrackingProps}
              />
            </FormUpdate>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between max-w-[650px]">
              <Label htmlFor="ogDescription">OpenGraph description</Label>
              <VariableMenu
                groups={SOCIAL_PREVIEW_VARIABLE_GROUPS}
                triggerSize="icon-sm"
                onInsert={(placeholder) => {
                  const el = ogDescriptionFieldRef.current;
                  if (el) {
                    insertAtOgDescriptionCursor(el.value, `{${placeholder}}`);
                    el.dispatchEvent(new Event("input", { bubbles: true }));
                  }
                }}
                onClose={restoreOgDescriptionFocus}
              />
            </div>
            <FormUpdate action="update">
              <Textarea
                id="ogDescription"
                name="ogDescription"
                ref={ogDescriptionFieldRef}
                defaultValue={social.ogDescription ?? defaultOgDescription}
                className="max-w-[650px]"
                onChange={(event) => setOgDescription(event.target.value)}
                {...ogDescriptionTrackingProps}
              />
            </FormUpdate>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Preview Image</h2>
          <Card className="max-w-[650px]">
            <CardHeader>
              <CardTitle className="text-xl">
                {replaceVariables(
                  ogTitle,
                  sampleCertificate,
                  sampleBatch,
                  "en-US",
                  program,
                )}
              </CardTitle>
              <CardDescription>
                {replaceVariables(
                  ogDescription,
                  sampleCertificate,
                  sampleBatch,
                  "en-US",
                  program,
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!social.contentType ? (
                <div className="w-full max-w-[600px] aspect-[1.91/1] flex border border-dashed border-slate-500 justify-center items-center bg-muted p-8">
                  Please upload the background layer for the social media
                  preview. Image formats PNG and JPEG are supported. Image size
                  should be 1200 x 630 pixels.
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
        </section>
        <section className="flex flex-col gap-4 pt-12">
          <div className="flex flex-col gap-2">
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
                {social.contentType ? "Replace" : "Upload"} background image
              </Button>
            </fetcherImage.Form>
            {social.contentType && (
              <Form action="delete" method="POST">
                <Button variant="outline" type="submit">
                  <Trash2 /> Remove background image
                </Button>
              </Form>
            )}
          </div>
          <p className="text-xs text-muted-foreground -mt-3 text-center">
            1200x630 pixel, PNG or JPEG
          </p>
          {social.contentType &&
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
