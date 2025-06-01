import type { Prisma } from "@prisma/client";

export type RegisterForm = {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
};

export type LoginForm = {
	email: string;
	password: string;
};

export type InviteForm = {
	email: string;
	firstName: string;
	lastName: string;
	adminOfPrograms?: number[];
};

// @todo add types for other forms

export type CertificatesWithBatchAndProgram = Prisma.CertificateGetPayload<{
	include: {
		batch: {
			include: {
				program: {
					include: {
						logo: true;
					};
				};
			};
		};
	};
}>;

export type ProgramWithBatches = Prisma.ProgramGetPayload<{
	include: { batches: true };
}>;

export type ProgramWithBatchesAndLogo = Prisma.ProgramGetPayload<{
	include: { batches: true; logo: true };
}>;

export type ProgramWithLogo = Prisma.ProgramGetPayload<{
	include: { logo: true };
}>;

export type UserWithAdminOfPrograms = Prisma.UserGetPayload<{
	include: { adminOfPrograms: true };
}>;

export type UserWithPhoto = Prisma.UserGetPayload<{
	include: { photo: true };
}>;
