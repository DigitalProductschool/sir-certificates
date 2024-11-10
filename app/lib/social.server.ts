import type { SocialPreview, Template } from "@prisma/client";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { readPreviewOfTemplate } from "./pdf.server";

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
		const composition = await composeImages(background, certificate);
		await writeFile(`${socialDir}/${social.id}.noPhoto.png`, composition);

		const compositionWithPhoto = await composeImages(
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

async function composeImages(
	background: Buffer,
	certificate: Buffer,
	photo?: Buffer,
) {
	const imageComposition = [];
	const withPhoto = photo ? true : false;

	if (withPhoto) {
		const scaledPhoto = await sharp(photo)
			.resize(300, 300, {
				position: "left top",
			})
			.toBuffer();

		imageComposition.push({
			input: scaledPhoto,
			top: 100,
			left: 150,
		});
	}

	const certTop = withPhoto ? 370 : 149;
	const certHeight = withPhoto ? 260 : 481;
	const shadowBlur = 10;
	const shadowMargin = 20;

	const dropShadow = Buffer.from(
		`<svg width="${432 + shadowMargin * 2}" height="${certHeight + shadowMargin}">
        		<rect x="${shadowMargin}" y="${shadowMargin}" width="${432}" height="${certHeight + shadowMargin}" rx="5" fill="black" filter="drop-shadow(0px 0px ${shadowBlur}px rgb(0 0 0 / 0.25))" />
    		</svg>`,
	);

	imageComposition.push({
		input: dropShadow,
		top: certTop - shadowMargin,
		left: 84 - shadowMargin,
	});

	const scaledCertificate = await sharp(certificate)
		.resize(432, certHeight, {
			position: "left top",
		})
		.toBuffer();

	imageComposition.push({
		input: scaledCertificate,
		top: certTop,
		left: 84,
	});

	const composition = await sharp(background)
		.composite(imageComposition)
		.toBuffer();

	return composition;
}
