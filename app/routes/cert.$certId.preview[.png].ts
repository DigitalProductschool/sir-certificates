import type { LoaderFunction } from "@remix-run/node";

import { prisma } from "~/lib/prisma.server";
import {
	/* generateCertificate,*/ generatePreviewOfCertificate,
} from "~/lib/pdf.server";

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

	const preview = await generatePreviewOfCertificate(certificate, true);

	return new Response(preview, {
		status: 200,
		headers: {
			"Content-Type": "image/png",
		},
	});
};
