import type {
	Certificate,
	SocialPreview,
	Template,
	UserPhoto,
	Prisma,
} from "@prisma/client";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import {
	generatePreviewOfCertificate,
	readPreviewOfTemplate,
} from "./pdf.server";
import { readPhoto } from "./user.server";

// @todo refactor to dry up filesystem functions across server libs
// @todo dry up extension code

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const socialDir = resolve(__dirname, "../../storage/social");
const assetsDir = resolve(__dirname, "../../public/assets");

export async function saveSocialBackground(social: SocialPreview, image: File) {
	const folderCreated = await ensureFolderExists(socialDir);
	if (!folderCreated) {
		throw new Error("Could not create social storage folder");
	}

	let extension: "jpg" | "png" | "unkown";
	switch (image.type) {
		case "image/png":
			extension = "png";
			break;
		case "image/jpeg":
			extension = "jpg";
			break;
		default:
			extension = "unkown";
	}

	const buffer = Buffer.from(await image.arrayBuffer());
	return await writeFile(
		`${socialDir}/${social.id}.background.${extension}`,
		buffer,
	);
}

export async function readBackgroundImage(social: SocialPreview) {
	let extension: "jpg" | "png" | "unkown";
	switch (social.contentType) {
		case "image/png":
			extension = "png";
			break;
		case "image/jpeg":
			extension = "jpg";
			break;
		default:
			extension = "unkown";
	}

	return await readFileIfExists(
		`${socialDir}/${social.id}.background.${extension}`,
	);
}

export async function readCompositeImage(
	social: SocialPreview,
	withPhoto: boolean,
) {
	return await readFileIfExists(
		`${socialDir}/${social.id}.${withPhoto ? "withPhoto" : "noPhoto"}.png`,
	);
}

export async function addTemplateToPreview(
	social: SocialPreview,
	template: Template,
) {
	const background = await readBackgroundImage(social);
	const certificate = await readPreviewOfTemplate(template);
	const photo = await readFileIfExists(`${assetsDir}/photo-placeholder.png`);

	if (background && certificate && photo) {
		const composition = await composeImages(
			social.layout as SocialPreviewLayout,
			background,
			certificate,
		);
		await writeFile(`${socialDir}/${social.id}.noPhoto.png`, composition);

		const compositionWithPhoto = await composeImages(
			social.layout as SocialPreviewLayout,
			background,
			certificate,
			photo,
		);
		await writeFile(
			`${socialDir}/${social.id}.withPhoto.png`,
			compositionWithPhoto,
		);
		return true;
	}
	return false;
}

export async function generateSocialPreview(
	social: SocialPreview,
	certificate: Certificate,
	userPhoto?: UserPhoto | null,
	withPlaceholder: boolean = false, // use a placeholder as fallback when no user photo available?
) {
	const background = await readBackgroundImage(social);
	const certificatePreview = await generatePreviewOfCertificate(
		certificate,
		true,
	);
	const photo = userPhoto
		? await readPhoto(userPhoto)
		: withPlaceholder
			? await readFileIfExists(`${assetsDir}/photo-placeholder.png`)
			: false;

	if (background && certificatePreview) {
		const certificateBuffer = Buffer.from(certificatePreview);

		const composition = await composeImages(
			social.layout as SocialPreviewLayout,
			background,
			certificateBuffer,
			photo ? photo : undefined,
		);

		return composition;
	}
	return null;
}

export type SocialPreviewLayout = Prisma.JsonObject & {
	photo: { x: number; y: number; size: number };
	certificate: {
		noPhoto: { x: number; y: number; w: number; h: number };
		withPhoto: { x: number; y: number; w: number; h: number };
	};
};

export const defaultLayout = {
	photo: {
		x: 450,
		y: 100,
		size: 300,
	},
	certificate: {
		noPhoto: {
			x: 350,
			y: 150,
			w: 500,
			h: 480,
		},
		withPhoto: {
			x: 350,
			y: 370,
			w: 500,
			h: 260,
		},
	},
} as SocialPreviewLayout;

async function composeImages(
	layout: SocialPreviewLayout,
	background: Buffer,
	certificate: Buffer,
	photo?: Buffer,
) {
	const imageComposition = [];
	const withPhoto = photo ? true : false;

	if (withPhoto) {
		const size = layout?.photo?.size || defaultLayout.photo.size;
		const scaledPhoto = await sharp(photo)
			.resize(size, size, {
				position: "left top",
			})
			.toBuffer();

		const x = layout?.photo?.x ?? defaultLayout.photo.x;
		const y = layout?.photo?.y ?? defaultLayout.photo.y;
		imageComposition.push({
			input: scaledPhoto,
			top: y,
			left: x,
		});
	}

	const certPos = withPhoto
		? layout?.certificate?.withPhoto || defaultLayout.certificate.withPhoto
		: layout?.certificate?.noPhoto || defaultLayout.certificate.noPhoto;

	const shadowBlur = 10;
	const shadowMargin = 20;

	const dropShadow = Buffer.from(
		`<svg width="${certPos.w + shadowMargin * 2}" height="${certPos.h + shadowMargin}">
        		<rect x="${shadowMargin}" y="${shadowMargin}" width="${certPos.w}" height="${certPos.h + shadowMargin}" rx="5" fill="black" filter="drop-shadow(0px 0px ${shadowBlur}px rgb(0 0 0 / 0.25))" />
    		</svg>`,
	);

	imageComposition.push({
		input: dropShadow,
		top: certPos.y - shadowMargin,
		left: certPos.x - shadowMargin,
	});

	const scaledCertificate = await sharp(certificate)
		.resize(certPos.w, certPos.h, {
			position: "left top",
		})
		.toBuffer();

	imageComposition.push({
		input: scaledCertificate,
		top: certPos.y,
		left: certPos.x,
	});

	const composition = await sharp(background)
		.composite(imageComposition)
		.toBuffer();

	return composition;
}
