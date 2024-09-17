import slug from "slug";
import type { LoaderFunction } from "@remix-run/node";

import { prisma } from "~/lib/prisma.server";
import { generateCertificate } from "~/lib/pdf.server";

export const loader: LoaderFunction = async ({ params }) => {
	// @todo is auth necessary or always public? For now it's public until "unpublish" is implemented

	const certificate = await prisma.certificate.findUnique({
		where: {
			uuid: params.certUuid,
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

	return new Response(pdf, {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename=${slug(`${certificate.firstName} ${certificate.lastName}`)}.certificate.pdf`,
		},
	});
};
