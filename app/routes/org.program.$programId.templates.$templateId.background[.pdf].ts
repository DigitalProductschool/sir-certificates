import type { Route } from "./+types/org.program.$programId.templates.$templateId.background[.pdf]";
import slug from "slug";

import { requireAdminWithProgram } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { readTemplateBackgroundFile } from "~/lib/pdf.server";

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireAdminWithProgram(request, Number(params.programId));

	const template = await prisma.template.findUnique({
		where: {
			id: Number(params.templateId),
			programId: Number(params.programId),
		},
	});

	// Blank backgrounds are generated on the fly and have no file to download
	if (!template || template.backgroundBytes === null) {
		throw new Response(null, {
			status: 404,
			statusText: "Not Found",
		});
	}

	const pdf = await readTemplateBackgroundFile(template);

	return new Response(pdf, {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename=${slug(template.name)}.background.pdf`,
		},
	});
}
