import type { Organisation, Prisma } from "@prisma/client";
import { prisma } from "./prisma.server";

export type PublicOrganisation = Prisma.OrganisationGetPayload<{
	select: {
		name: true;
		imprintUrl: true;
		privacyUrl: true;
	};
}>;

let org: Organisation | null = null;
let publicOrg: PublicOrganisation | null = null;

export async function getOrg(): Promise<Organisation> {
	if (org === null) {
		// not cached yet

		org = await prisma.organisation.findUnique({
			where: {
				id: 1,
			},
		});

		if (org === null) {
			// not found in database
			org = {
				id: 1,
				name: "(Configure Organisation)",
				imprintUrl: null,
				privacyUrl: null,
				senderEmail: null,
				senderName: null,
			};
		}
	}

	return org;
}

export async function getPublicOrg(): Promise<PublicOrganisation> {
	if (publicOrg === null) {
		// not cached yet

		publicOrg = await prisma.organisation.findUnique({
			where: {
				id: 1,
			},
			select: {
				name: true,
				imprintUrl: true,
				privacyUrl: true,
			},
		});

		if (publicOrg === null) {
			// not found in database
			publicOrg = {
				name: "(Configure Organisation)",
				imprintUrl: null,
				privacyUrl: null,
			};
		}
	}

	return publicOrg;
}
