import type { LoaderFunction } from "@remix-run/node";

import { prisma } from "~/lib/prisma.server";
import { generateCertificate } from "~/lib/pdf.server";

export const loader: LoaderFunction = async ({ params }) => {
	// @todo is auth necessary or always public?

	const certificate = await prisma.certificate.findUnique({
		where: {
			id: Number(params.certId),
		},
		include: {
			batch: true,
		},
	});

	if (!certificate) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const skipIfExists = true;
	const pdf = await generateCertificate(
		certificate,
		certificate.batch,
		skipIfExists,
	);

	// @todo sanitize names for use as filename, fix filename

	return new Response(pdf, {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename*="${certificate.firstName} ${certificate.lastName} Certificate.pdf"`,
		},
	});
};
