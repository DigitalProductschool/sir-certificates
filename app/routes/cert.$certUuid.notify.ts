import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import Mailjet from "node-mailjet";
import slug from "slug";

import { requireAdmin } from "~/lib/auth.server";
import { domain } from "~/lib/config.server";
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

	const certUrl = `${domain}/view/${certificate.uuid}?signup=${certificate.email}`;

	const mailText = social
		? `Dear ${certificate.firstName},\n\nyour certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready for you.\n\n\nDownload your certificate from this link:\n${certUrl}\n\n\nShare your certificate on social media with your personal link:\n1. Sign up to our certificate tool with this email address at the link above\n2. Insert your photo into the social media preview\n3. Share it across your platforms\n\n\nCongratulations!`
		: `Dear ${certificate.firstName},\n\nyour certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready and the document attached to this email.\n\nAll the best!`;
	const mailHTML = social
		? `<p>Dear ${certificate.firstName},</p><p>your certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready for you.</p><p>Download your certificate from this link:<br/><a href="${certUrl}" rel="notrack">${certUrl}</a></p><p>Share your certificate on social media with your personal link:<ol><li><a href="${domain}/user/login?sign=up&email=${certificate.email}&firstName=${certificate.firstName}&lastName=${certificate.lastName}" rel="notrack">Sign up</a> to our certificate tool with this email address at the link above</li><li>Insert your photo into the social media preview</li><li>Share it across your platforms</li></ol></p><p>Congratulations!</p><br/>`
		: `<p>Dear ${certificate.firstName},</p><p>your certificate for ${certificate.batch.program.name} – ${certificate.batch.name} is ready and the document attached to this email.</p><p>All the best!</p>`;

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
