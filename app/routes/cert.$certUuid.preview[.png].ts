import type { Route } from "./+types/cert.$certUuid.preview[.png]";

import { getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { generatePreviewOfCertificate } from "~/lib/pdf.server";

/* Certificate preview images 

- only available for published certificates, except for admins

*/

export async function loader({ params, request }: Route.LoaderArgs) {
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

	// If the certificate is not yet published and the user is not an admin, we pretend it doesn't exist
	const activeUser = await getUser(request);
	if (
		certificate.publishedAt === null &&
		(!activeUser?.isAdmin || !activeUser?.isSuperAdmin)
	) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	/* @todo Refactor to LazyFile and streaming the response */
	const preview = await generatePreviewOfCertificate(certificate, true);

	if (!preview) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	// Conversion for Typescript
	const previewBuffer = new Uint8Array(preview);

	return new Response(previewBuffer, {
		status: 200,
		headers: {
			"Content-Type": "image/png",
		},
	});
}
