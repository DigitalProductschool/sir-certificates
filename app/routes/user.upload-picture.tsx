import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useEffect, useState, useRef } from "react";
import {
	json,
	redirect,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from "@remix-run/node";
import { Form, Link, useNavigate } from "@remix-run/react";

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

import { requireUserId, getUser } from "~/lib/auth.server";
import { saveUploadedPhoto } from "~/lib/user.server";
import { prisma /*, throwErrorResponse */ } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request }) => {
	const userId = await requireUserId(request);
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});
	if (!user) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	let contentType: string = "";
	let extension: "png" | "jpg" = "png";

	const uploadHandler = unstable_createMemoryUploadHandler({
		maxPartSize: 5 * 1024 * 1024,
		filter: (field) => {
			if (field.name === "photo") {
				if (field.contentType === "image/png") {
					contentType = field.contentType;
					extension = "png";
					return true;
				} else if (field.contentType === "image/jpeg") {
					contentType = field.contentType;
					extension = "jpg";
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

	const photo = formData.get("photo") as File;

	if (photo) {
		await saveUploadedPhoto(user, photo, extension);

		console.log(user, contentType);

		const photoBuffer = await photo.arrayBuffer();

		// @todo use Content-Type from uploaded picture instead of hard-coded value
		await fetch(
			"https://ai-background-removal-f3m36uw7ma-ey.a.run.app/",
			{
				method: "POST",
				cache: "no-cache",
				headers: {
					"Content-Type": "image/jpeg",
					red: "0",
					green: "0",
					blue: "0",
					alpha: "0",
				},
				body: photoBuffer,
			},
		);
	}	

	return redirect("./");
};

export const loader: LoaderFunction = async ({ request }) => {
	await requireUserId(request);
	const user = await getUser(request);

	return json({ user });
};

export const handle = {
	breadcrumb: () => <Link to="#">Batch XXX</Link>,
};

export default function UserUploadPictureDialog() {
	//const { user } = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const [open, setOpen] = useState(true);
	const formRef = useRef<HTMLFormElement | null>(null);

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
				<DialogHeader>
					<DialogTitle>Upload picture</DialogTitle>
					<DialogDescription>...</DialogDescription>
				</DialogHeader>
				<Form
					method="POST"
					encType="multipart/form-data"
					ref={formRef}
					className="grid gap-4 py-4"
				>
					<Label htmlFor="photo">Picture</Label>
					<Input id="photo" name="photo" type="file" />
				</Form>
				<DialogFooter>
					<Button onClick={() => formRef.current?.submit()}>
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
