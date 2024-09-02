import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

import { requireUserId } from "~/lib/auth.server";
import { generateCertificate } from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request }) => {
	// @todo require admin user
	await requireUserId(request);

	const formData = await request.formData();
	const inputs = Object.fromEntries(formData);

	// If this email exists already for this batch, update instead of create
	const certificate = await prisma.certificate
		.upsert({
			where: {
				certId: {
					email: inputs.email,
					batchId: Number(inputs.batchId),
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
			include: {
				batch: true,
			},
		})
		.catch((error) => {
			throwErrorResponse(error, "Could not import certificate");
		});

	if (certificate) {
		const skipIfExists = false;
		await generateCertificate(certificate, certificate.batch, skipIfExists);
	}

	return json({ certificate });
};
