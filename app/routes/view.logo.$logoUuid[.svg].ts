import type { LoaderFunction } from "react-router";

import { prisma } from "~/lib/prisma.server";
import { readProgramLogo } from "~/lib/program.server";

export const loader: LoaderFunction = async ({ params }) => {
	const logo = await prisma.programLogo.findUnique({
		where: {
			uuid: params.logoUuid,
		},
	});

	if (!logo) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const logoBuffer = await readProgramLogo(logo);

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
};
