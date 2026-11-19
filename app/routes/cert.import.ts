import type { Route } from "./+types/cert.import";
import { randomUUID } from "node:crypto";
import { redirect } from "react-router";

import { requireAdmin, requireAdminWithProgram } from "~/lib/auth.server";
import {
	generateCertificate,
	generatePreviewOfCertificate,
} from "~/lib/pdf.server";
import { prisma, throwErrorResponse } from "~/lib/prisma.server";
import { assertTemplateNotArchived } from "~/lib/template.server";

export async function action({ request }: Route.ActionArgs) {
	await requireAdmin(request);

	const formData = await request.formData();
	const inputs = Object.fromEntries(formData) as { [k: string]: string };

	if (!inputs.email || inputs.email === "" || inputs.email === "undefined") {
		throw new Response(null, {
			status: 400,
			statusText: "Missing email",
		});
	}

	const email = inputs.email.toLowerCase();

	// The program is derived from the batch, so the admin needs access to it
	const batch = await prisma.batch.findUnique({
		where: { id: Number(inputs.batchId) },
		select: { programId: true },
	});
	if (!batch) {
		throw new Response(null, { status: 404, statusText: "Batch not found" });
	}

	await requireAdminWithProgram(request, batch.programId);

	// The template must belong to the same program as the batch
	const template = await prisma.template.findFirst({
		where: { id: Number(inputs.templateId), programId: batch.programId },
		select: { id: true },
	});
	if (!template) {
		throw new Response(null, {
			status: 404,
			statusText: "Template not found",
		});
	}
	
	await assertTemplateNotArchived(template.id);

	// If this email exists already for this batch, update instead of create
	const certificate = await prisma.certificate
		.upsert({
			where: {
				certId: {
					email: email,
					batchId: Number(inputs.batchId),
				},
			},
			update: {
				firstName: inputs.firstName?.trim(),
				lastName: inputs.lastName?.trim(),
				teamName: inputs.team?.trim() || undefined,
				template: {
					connect: {
						id: Number(inputs.templateId),
					},
				},
			},
			create: {
				uuid: randomUUID(),
				firstName: inputs.firstName?.trim(),
				lastName: inputs.lastName?.trim(),
				teamName: inputs.team?.trim() || undefined,
				email: email?.trim(),
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

	return { certificate };
}

export async function loader() {
	// @todo redirect to the correct program/batch overview?
	return redirect(`/org/program`);
}
