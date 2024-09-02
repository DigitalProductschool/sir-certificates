import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

import { requireUserId } from "~/lib/auth.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request }) => {
	// @todo require admin user
	await requireUserId(request);

	const formData = await request.formData();
	const inputs = Object.fromEntries(formData);

	// @todo validate inputs? (or rely on Prisma internal validation?)

	// If this email exists already for this batch, update instead of create
	const certificate = await prisma.certificate
		.upsert({
			where: {
				certId: {
					email: inputs.email,
					batchId: 0, // Number(inputs.batchId),
				},
			},
			update: {
				firstName: inputs.firstName,
				lastName: inputs.lastName,
				// @todo team, track
			},
			create: {
				firstName: inputs.firstName,
				lastName: inputs.lastName,
				email: inputs.email,
				batch: {
					connect: { id: Number(inputs.batchId) },
				},
			},
		})
		.catch((error) => {
			throwErrorResponse(error, "Could not import certificate");
		});

	return json({ certificate });
};
