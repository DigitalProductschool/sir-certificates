import type { Prisma } from "~/generated/prisma/client";

// Type declarations for PrismaJson fields
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace PrismaJson {
		type QRCode = {
			show: boolean;
			x: number;
			y: number;
			width: number;
			color: [number, number, number];
			background: [number, number, number];
			ec: "L" | "M" | "Q" | "H";
		};

		type SocialPreviewLayout = {
			photo: { x: number; y: number; size: number };
			certificate: {
				noPhoto: { x: number; y: number; w: number; h: number };
				withPhoto: { x: number; y: number; w: number; h: number };
			};
		};

		type TextBlock = {
			x: number;
			y: number;
			id: string;
			size: number;
			maxWidth?: number;
			lineHeight?: number;
			align?: "left" | "center" | "right";
			color?: [number, number, number];
			lines: TextSegment[];
		};

		type TextSegment = {
			id: string;
			font: string;
			text: string;
		};
	}
}

export type InviteForm = {
	email: string;
	firstName: string;
	lastName: string;
	adminOfPrograms?: number[];
};

// @todo add types for other forms

export type CertificatesWithBatch = Prisma.CertificateGetPayload<{
	include: {
		batch: true;
	};
}>;

export type CertificatesWithBatchAndProgram = Prisma.CertificateGetPayload<{
	select: {
		id: true;
		uuid: true;
		updatedAt: true;
		batch: {
			select: {
				name: true;
				program: {
					select: {
						name: true;
						logo: { select: { uuid: true; updatedAt: true } };
					};
				};
			};
		};
	};
}>;

export type CertificateView = Prisma.CertificateGetPayload<{
	select: {
		uuid: true;
		firstName: true;
		lastName: true;
		email: true;
		teamName: true;
		updatedAt: true;
	};
}>;

export type CertificateViewBatch = Prisma.BatchGetPayload<{
	select: {
		name: true;
		startDate: true;
		endDate: true;
	};
}>;

export type ProgramView = Prisma.ProgramGetPayload<{
	select: { name: true; about: true; achievement: true; website: true };
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

export type UserAuthenticated = Prisma.UserGetPayload<{
	select: {
		id: true;
		email: true;
		firstName: true;
		lastName: true;
		isAdmin: true;
		isSuperAdmin: true;
		adminOfPrograms: { select: { id: true } };
		photo: { select: { updatedAt: true } };
	};
}>;

// Subset of UserAuthenticated that is safe to send to the browser (participant UI)
export type UserParticipant = Pick<
	UserAuthenticated,
	"firstName" | "lastName" | "email" | "isAdmin" | "photo"
>;

export type UserContact = Prisma.UserGetPayload<{
	select: {
		email: true;
		firstName: true;
		lastName: true;
	};
}>;
