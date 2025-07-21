import type { Route } from "./+types/cert.$certUuid.preview[.png]";

import { prisma } from "~/lib/prisma.server";
import { generatePreviewOfCertificate } from "~/lib/pdf.server";

export async function loader({ params }: Route.LoaderArgs) {
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

	const preview = await generatePreviewOfCertificate(certificate, true);

	return new Response(preview, {
		status: 200,
		headers: {
			"Content-Type": "image/png",
		},
	});
}
