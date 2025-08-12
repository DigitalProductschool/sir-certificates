import type { OrganisationLogo, Prisma } from "@prisma/client";
import type { FileUpload } from "@mjackson/form-data-parser";
import { unlink } from "node:fs/promises";
import {
	openFile as lazyOpenFile,
	writeFile as lazyWriteFile,
} from "@mjackson/lazy-file/fs";

import { prisma } from "./prisma.server";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { logoDir } from "./program.server";

export type OrgWithLogo = Prisma.OrganisationGetPayload<{
	include: {
		logo: true;
	};
}>;

export type PublicOrgWithLogo = Prisma.OrganisationGetPayload<{
	select: {
		name: true;
		imprintUrl: true;
		privacyUrl: true;
		logo: true;
	};
}>;

// @todo evaluate against potential race-conditions / how long is this value cached?
let org: OrgWithLogo | null = null;
let publicOrg: PublicOrgWithLogo | null = null;

export async function getOrg(): Promise<OrgWithLogo> {
	if (org === null) {
		// not cached yet

		org = await prisma.organisation.findUnique({
			where: {
				id: 1,
			},
			include: {
				logo: true,
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
				updatedAt: new Date(),
				logo: null,
			};
		}
	}

	return org;
}

export async function getPublicOrg(): Promise<PublicOrgWithLogo> {
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
				logo: true,
			},
		});

		if (publicOrg === null) {
			// not found in database
			publicOrg = {
				name: "(Configure Organisation)",
				imprintUrl: null,
				privacyUrl: null,
				logo: null,
			};
		}
	}

	return publicOrg;
}

export async function saveOrg(update: {
	[k: string]: string;
}): Promise<OrgWithLogo> {
	// save and update cache
	org = await prisma.organisation.update({
		where: {
			id: 1,
		},
		data: update,
		include: {
			logo: true,
		},
	});
	return org;
}

export async function refreshCachedOrg() {
	org = await prisma.organisation.findUnique({
		where: {
			id: 1,
		},
		include: {
			logo: true,
		},
	});
	publicOrg = await prisma.organisation.findUnique({
		where: {
			id: 1,
		},
		select: {
			name: true,
			imprintUrl: true,
			privacyUrl: true,
			logo: true,
		},
	});
	return { org, publicOrg };
}

export async function saveOrganisationLogoUpload(
	logo: OrganisationLogo,
	image: FileUpload,
) {
	const folderCreated = await ensureFolderExists(logoDir);
	if (!folderCreated) {
		throw new Error("Could not create social storage folder");
	}

	let extension: "svg" | "unkown";
	switch (image.type) {
		case "image/svg+xml":
			extension = "svg";
			break;
		default:
			extension = "unkown";
	}

	const filepath = `${logoDir}/_org.${logo.id}.logo.${extension}`;
	await lazyWriteFile(filepath, image);
	return lazyOpenFile(filepath);
}

export async function readOrganisationLogo(logo: OrganisationLogo) {
	let extension: "svg" | "unkown";
	switch (logo.contentType) {
		case "image/svg+xml":
			extension = "svg";
			break;
		default:
			extension = "unkown";
	}

	return await readFileIfExists(
		`${logoDir}/_org.${logo.id}.logo.${extension}`,
	);
}

export async function deleteOrganisationLogo(logo: OrganisationLogo) {
	let extension: "svg" | "unkown";
	switch (logo.contentType) {
		case "image/svg+xml":
			extension = "svg";
			break;
		default:
			extension = "unkown";
	}

	return await unlink(`${logoDir}/_org.${logo.id}.logo.${extension}`).catch(
		(error) => {
			console.error(
				`Encountered the following error when trying to delete the organisation logo file in storage for ID ${logo.id}:`,
			);
			console.error(error);
		},
	);
}
