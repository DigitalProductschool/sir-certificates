// @todo rename route to cert.import
import { randomUUID } from "node:crypto";
import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

import { requireAdmin } from "~/lib/auth.server";
import {
	generateCertificate,
	generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request }) => {
	await requireAdmin(request);

	const formData = await request.formData();
	const inputs = Object.fromEntries(formData);

	if (!inputs.email || inputs.email === "") {
		throw new Response(null, {
			status: 400,
			statusText: "Missing email",
		});
	}

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
				teamName: inputs.team || undefined,
				template: {
					connect: {
						id: Number(inputs.templateId),
					},
				},
			},
			create: {
				uuid: randomUUID(),
				firstName: inputs.firstName,
				lastName: inputs.lastName,
				teamName: inputs.team || undefined,
				email: inputs.email,
				batch: {
					connect: { id: Number(inputs.batchId) },
				},
				template: {
					connect: {
						id: Number(inputs.templateId),
					},
				},
			},
			include: {
				batch: true,
				template: true,
			},
		})
		.catch((error) => {
			throwErrorResponse(error, "Could not import certificate");
		});

	if (certificate) {
		const skipIfExists = false;
		await generateCertificate(
			certificate.batch,
			certificate,
			certificate.template,
			skipIfExists,
		);
		await generatePreviewOfCertificate(certificate, skipIfExists);
	}

	return json({ certificate });
};
