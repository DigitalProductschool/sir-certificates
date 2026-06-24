import type { Route } from "./+types/test";
import { useState } from "react";
import { Form, Outlet } from "react-router";

import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";

import { requireLocalhost } from "~/lib/auth.server";

export function meta() {
	return [{ title: "Error Testing" }];
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireLocalhost(request);
	return null;
}

export default function TestPage() {
	const [status, setStatus] = useState("404");

	return (
		<div className="flex flex-col gap-8 p-8">
			<Form method="POST" action="/test/error" className="flex gap-2">
				<input type="hidden" name="status" value={status} />

				<div className="flex flex-col gap-2">
					<Label>Status code</Label>
					<Select value={status} onValueChange={setStatus}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="404">404 – Not Found</SelectItem>
							<SelectItem value="403">403 – Forbidden</SelectItem>
							<SelectItem value="400">
								400 – Bad Request
							</SelectItem>
							<SelectItem value="500">
								500 – Server Error
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-2">
					<Label>HTML Title</Label>
					<Input name="title" />
				</div>

				<div className="flex flex-col gap-2">
					<Label>Error Message</Label>
					<Input name="message" />
				</div>

				<div className="flex flex-col gap-2">
					<Label>Error Detail</Label>
					<Input name="detail" />
				</div>

				<Button type="submit" className="self-end">
					Trigger Error
				</Button>
			</Form>

			<Separator />

			<Outlet />
		</div>
	);
}
