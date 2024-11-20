import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import Mailjet from "node-mailjet";
import slug from "slug";

import { requireAdmin } from "~/lib/auth.server";
import { generateCertificate } from "~/lib/pdf.server";
import { prisma } from "~/lib/prisma.server";

export const action: ActionFunction = async ({ request, params }) => {
	await requireAdmin(request);

	const certificate = await prisma.certificate.findUnique({
		where: {
			uuid: params.certUuid,
		},
		include: {
			batch: {
				include: {
					program: true,
				},
			},
			template: true,
		},
	});

	if (!certificate) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const org = await prisma.organisation.findUnique({
		where: {
			id: 1,
		},
	});

	if (!org) {
		throw new Response(null, {
			status: 500,
			statusText: "Missing organisation",
		});
	}

	const social = await prisma.socialPreview.findUnique({
		where: {
			programId: certificate.batch.programId,
		},
	});

	// @todo refactor to singleton/import
	const mailjet = new Mailjet({
		apiKey: process.env.MJ_APIKEY_PUBLIC,
		apiSecret: process.env.MJ_APIKEY_PRIVATE,
	});

	const pdf = await generateCertificate(
		certificate.batch,
		certificate,
		certificate.template,
		true,
	);
	let pdfBase64;
	if (pdf) {
		pdfBase64 = pdf.toString("base64");
	}

	const domain = process.env.HOST;

	const mailText = social
		? `Dear ${certificate.firstName},\n\nyour certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready for you.\n\nYou can download and share your certificate with this link:\n${domain}/view/${certificate.uuid}\n\nCongratulations!`
		: `Dear ${certificate.firstName},\n\nyour certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready and the document attached to this email.\n\nAll the best!`;
	const mailHTML = social
		? `<p>Dear ${certificate.firstName} ${certificate.lastName},</p><p>your certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready for you.</p><p>You can download and share your certificate with this link:<br /><a href="${domain}/view/${certificate.uuid}">${domain}/view/${certificate.uuid}</a></p><p>Congratulations!</p>`
		: `<p>Dear ${certificate.firstName} ${certificate.lastName},</p><p>your certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready and the document attached to this email.</p><p>All the best!</p>`;

	// @todo sender email, domain and links need to be configurable
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const response: any = await mailjet
		.post("send", { version: "v3.1" })
		.request({
			// SandboxMode: true,
			Messages: [
				{
					CustomId: certificate.uuid,
					From: {
						Email: "notifications@certificates.unternehmertum.de",
						Name: `${org.name} Certificates`,
					},
					To: [
						{
							Email: certificate.email,
							Name: `${certificate.firstName} ${certificate.lastName}`,
						},
					],
					Subject: `Your certificate from ${certificate.batch.program.name} is ready`,
					TextPart: mailText,
					HTMLPart: mailHTML,
					Attachments: [
						{
							ContentType: "application/pdf",
							Filename:
								slug(
									`${certificate.firstName} ${certificate.lastName}`,
								) + ".certificate.pdf",
							ContentID: "certpreview",
							Base64Content: pdfBase64,
						},
					],
				},
			],
		})
		.catch((error) => {
			throw new Response(error.message, {
				status: 500,
				statusText: error.statusCode,
			});
		});

	await prisma.certificate.update({
		where: {
			id: certificate.id,
		},
		data: {
			notifiedAt: new Date(),
			mjResponse: response.body.Messages?.[0],
		},
	});

	return json(response.body);
};
