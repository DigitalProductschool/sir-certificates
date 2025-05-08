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
