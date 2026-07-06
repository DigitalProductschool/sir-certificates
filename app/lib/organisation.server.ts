import type { OrganisationLogo, OrganisationBrandImage, Prisma } from "~/generated/prisma/client";
import type { FileUpload } from "@remix-run/form-data-parser";
import { unlink } from "node:fs/promises";
import { openLazyFile, writeFile as lazyWriteFile } from "@remix-run/fs";

import { prisma } from "./prisma.server";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { logoDir } from "./program.server";

export type OrgWithLogo = Prisma.OrganisationGetPayload<{
	include: {
		logo: true;
		brandImage: true;
	};
}>;

export type PublicOrgWithLogo = Prisma.OrganisationGetPayload<{
	select: {
		name: true;
		imprintUrl: true;
		privacyUrl: true;
		logo: true;
		brandImage: true;
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
				brandImage: true,
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
				brandImage: null,
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
				brandImage: true,
			},
		});

		if (publicOrg === null) {
			// not found in database
			publicOrg = {
				name: "(Configure Organisation)",
				imprintUrl: null,
				privacyUrl: null,
				logo: null,
				brandImage: null,
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
			brandImage: true,
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
			brandImage: true,
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
			brandImage: true,
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
	return openLazyFile(filepath);
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

export async function saveOrganisationBrandImageUpload(
	brandImage: OrganisationBrandImage,
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

	const filepath = `${logoDir}/_org.${brandImage.id}.brand-image.${extension}`;
	await lazyWriteFile(filepath, image);
	return openLazyFile(filepath);
}

export async function readOrganisationBrandImage(brandImage: OrganisationBrandImage) {
	let extension: "svg" | "unkown";
	switch (brandImage.contentType) {
		case "image/svg+xml":
			extension = "svg";
			break;
		default:
			extension = "unkown";
	}

	return await readFileIfExists(
		`${logoDir}/_org.${brandImage.id}.brand-image.${extension}`,
	);
}

export async function deleteOrganisationBrandImage(brandImage: OrganisationBrandImage) {
	let extension: "svg" | "unkown";
	switch (brandImage.contentType) {
		case "image/svg+xml":
			extension = "svg";
			break;
		default:
			extension = "unkown";
	}

	return await unlink(`${logoDir}/_org.${brandImage.id}.brand-image.${extension}`).catch(
		(error) => {
			console.error(
				`Encountered the following error when trying to delete the organisation brand image file in storage for ID ${brandImage.id}:`,
			);
			console.error(error);
		},
	);
}
