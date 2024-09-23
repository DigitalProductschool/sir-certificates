import type { ActionFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import {
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";

import { Form, useNavigate, useRouteError } from "@remix-run/react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
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

import { requireAdmin } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { saveUploadedTypeface } from "~/lib/typeface.server";

export const action: ActionFunction = async ({ request }) => {
  await requireAdmin(request);

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5 * 1024 * 1024,
    filter: (field) => {
      if (field.name === "ttf") {
        if (field.contentType === "font/ttf") {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    },
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

  const typefaceName =
    (formData.get("typefaceName") as string) || "(Typeface Name)";
  const weight = Number(formData.get("weight")) || 400;
  const style = (formData.get("style") as string) || "normal";
  const typefaceTTF = formData.get("ttf") as File;

  if (!typefaceTTF) {
    throw new Response(null, {
      status: 400,
      statusText: "Missing uploaded TTF file",
    });
  }

  const typeface = await prisma.typeface
    .create({
      data: {
        name: typefaceName,
        weight: weight,
        style: style,
      },
    })
    .catch((error) => {
      throwErrorResponse(error, "Could not import typeface");
    });

  if (typeface) {
    await saveUploadedTypeface(typeface, typefaceTTF);
    return redirect(`/org/typeface`);
  }

  throw new Response(null, {
    status: 500,
    statusText: "Unkown error when creating new typeface",
  });
};

export default function CreateTypefaceDialog() {
  const [typefaceName, setTypefaceName] = useState("");
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [navigate]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) navigate(-1);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <Form method="POST" encType="multipart/form-data">
          <DialogHeader>
            <DialogTitle>Add typeface</DialogTitle>
            <DialogDescription>
              Upload a new typeface that can be used for text rendering. The
              font file needs to be in Truetype format (.ttf).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="ttf">Select a TTF file</Label>
            <Input
              id="ttf"
              name="ttf"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  let filename = e.target.files[0].name;
                  if (filename.lastIndexOf(".") > 0) {
                    filename = filename.substring(0, filename.lastIndexOf("."));
                  }
                  setTypefaceName(filename);
                }
              }}
            />
            <Label htmlFor="typefaceName">Typeface name</Label>
            <Input
              id="typefaceName"
              name="typefaceName"
              value={typefaceName}
              onChange={(e) => setTypefaceName(e.target.value)}
            />
            <Label htmlFor="weight">Weight</Label>
            <Select name="weight" defaultValue="400">
              <SelectTrigger>
                <SelectValue placeholder="Select weight" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="200">Light</SelectItem>
                <SelectItem value="400">Regular</SelectItem>
                <SelectItem value="700">Bold</SelectItem>
              </SelectContent>
            </Select>
            <Label htmlFor="style">Style</Label>
            <Select name="style" defaultValue="normal">
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="italic">Italic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Upload Typeface</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);

  // @todo improve user-facing error display

  return <div>Error</div>;
}
