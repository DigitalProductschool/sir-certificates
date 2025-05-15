import type { LoaderFunction } from "@remix-run/node";

import { prisma } from "~/lib/prisma.server";
import { readProgramLogo } from "~/lib/program.server";

export const loader: LoaderFunction = async ({ params }) => {
	// @todo use UUID instead of ID (make it harder to guess and reveal internals)
	const logo = await prisma.programLogo.findUnique({
		where: {
			id: Number(params.logoId),
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
