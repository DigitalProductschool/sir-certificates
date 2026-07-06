import { prisma } from "~/lib/prisma.server";
import { readOrganisationBrandImage } from "~/lib/organisation.server";

export async function loader() {
	const brandImage = await prisma.organisationBrandImage.findUnique({
		where: {
			orgId: 1,
		},
	});

	if (!brandImage) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const buffer = await readOrganisationBrandImage(brandImage);

	if (buffer) {
		return new Response(buffer, {
			status: 200,
			headers: {
				"Content-Type": brandImage.contentType,
			},
		});
	} else {
		throw new Response(null, {
			status: 404,
			statusText: "File not Found",
		});
	}
}
