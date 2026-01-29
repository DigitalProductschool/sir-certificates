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

export type CertificatesWithBatch = Prisma.CertificateGetPayload<{
	include: {
		batch: true;
	};
}>;

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
		adminOfPrograms: true;
		photo: true;
	};
}>;
