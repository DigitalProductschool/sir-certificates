import { prisma } from "~/lib/prisma.server";
import { readOrganisationLogo } from "~/lib/organisation.server";

export async function loader() {
	const logo = await prisma.organisationLogo.findUnique({
		where: {
			id: 1,
		},
	});

	if (!logo) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const logoBuffer = await readOrganisationLogo(logo);

	if (logoBuffer) {
		return new Response(logoBuffer, {
			status: 200,
			headers: {
				"Content-Type": logo.contentType,
			},
		});
	} else {
		throw new Response(null, {
			status: 404,
			statusText: "File not Found",
		});
	}
}
