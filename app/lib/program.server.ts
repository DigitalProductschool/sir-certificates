import type { Program } from "@prisma/client";
import { prisma } from "./prisma.server";

export async function getProgramsByAdmin(adminId: number) {
	const admin = await prisma.user.findUnique({
		where: {
			id: adminId,
		},
	});

	const filterPrograms = admin?.isSuperAdmin
		? undefined
		: {
				admins: {
					some: {
						id: adminId,
					},
				},
			};

	return await prisma.program.findMany({
		where: filterPrograms,
		orderBy: {
			name: "asc",
		},
	});
}

export async function requireAccessToProgram(
	adminId: number,
	programId: number,
) {
	const admin = await prisma.user.findUnique({
		where: {
			id: adminId,
		},
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			isAdmin: true,
			isSuperAdmin: true,
			adminOfPrograms: true,
		},
	});

	if (!admin || !(admin.isAdmin || admin.isSuperAdmin)) {
		throw new Response(null, {
			status: 403,
			statusText: "You need to be a program manager to access this page.",
		});
	}

	if (admin.isSuperAdmin) {
		return admin;
	}

	if (
		admin.isAdmin &&
		admin.adminOfPrograms.some(
			(program: Program) => program.id === programId,
		)
	) {
		return admin;
	}

	throw new Response(null, {
		status: 403,
		statusText: "You do not have access to this program.",
	});
}
