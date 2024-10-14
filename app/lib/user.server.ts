import type { User, UserInvitation, UserPhoto } from "@prisma/client";
import type { RegisterForm, InviteForm } from "./types.server";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import Mailjet from "node-mailjet";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma } from "./prisma.server";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const userPhotoDir = resolve(__dirname, "../../storage/user/photos");

export const createUser = async (user: RegisterForm) => {
	const passwordHash = await bcrypt.hash(user.password, 10);
	const verifyCode = randomUUID();
	const newUser = await prisma.user.create({
		data: {
			email: user.email,
			password: passwordHash,
			firstName: user.firstName,
			lastName: user.lastName,
			verifyCode,
		},
	});
	await sendVerificationEmail(newUser);
	return { id: newUser.id, email: user.email };
};

export const createUserInvitation = async (
	user: InviteForm,
	from: User | null,
) => {
	const verifyCode = randomUUID();
	const invite = await prisma.userInvitation.create({
		data: {
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			isAdmin: true,
			verifyCode,
		},
	});
	await sendInvitationEmail(invite, from);
	return { id: invite.id, email: user.email };
};

export const sendVerificationEmail = async (user: User) => {
	// @todo refactor to singleton/import
	const mailjet = new Mailjet({
		apiKey: process.env.MJ_APIKEY_PUBLIC,
		apiSecret: process.env.MJ_APIKEY_PRIVATE,
	});

	// @todo dynamic domain and org name (from settings?)
	const verificationUrl = `https://certificates.unternehmertum.de/user/verify/${user.id}/${user.verifyCode}`;

	await mailjet
		.post("send", { version: "v3.1" })
		.request({
			Messages: [
				{
					From: {
						Email: "registrations@certificates.unternehmertum.de",
						Name: "UnternehmerTUM Certificates",
					},
					To: [
						{
							Email: user.email,
							Name: `${user.firstName} ${user.lastName}`,
						},
					],
					Subject: `Please verify your email`,
					TextPart: `Dear ${user.firstName} ${user.lastName},\n\nto complete your sign up for UnternehmerTUM Certificates, please click on the following link:\n${verificationUrl}\n\nIf you haven't signed up yourself, please ignore or report this email.\n\nThank you!`,
					HTMLPart: `<p>Dear ${user.firstName} ${user.lastName},</p><p>to complete your sign up for UnternehmerTUM Certificates, please click on the following link:<br /><a href="${verificationUrl}">${verificationUrl}</a></p><p>If you haven't signed up yourself, please ignore or report this email.</p><p>Thank you!</p>`,
				},
			],
		})
		.catch((error) => {
			throw new Response(error.message, {
				status: 500,
				statusText: error.statusCode,
			});
		});

	return true;
};

export const sendInvitationEmail = async (
	invite: UserInvitation,
	from: User | null,
) => {
	// @todo refactor into a singleton/import
	const mailjet = new Mailjet({
		apiKey: process.env.MJ_APIKEY_PUBLIC,
		apiSecret: process.env.MJ_APIKEY_PRIVATE,
	});

	// @todo dynamic domain (from settings?) // @todo replace org names
	const acceptUrl = `https://certificates.unternehmertum.de/user/accept-invite/${invite.id}/${invite.verifyCode}`;

	const text = `Dear ${invite.firstName} ${invite.lastName},\n\n${from ? `${from.firstName} ${from.lastName} is inviting you` : "you have been invited"} to become an admiminstrator for the UnternehmerTUM certificates tool.\n\nTo accept the invitation, please click on the following link:\n${acceptUrl}\n\nThank you!`;
	const html = `<p>Dear ${invite.firstName} ${invite.lastName},</p><p>${from ? `${from.firstName} ${from.lastName} is inviting you` : "you have been invited"} to become an admiminstrator for the UnternehmerTUM certificates tool.</p><p>To accept the invitation, please click on the following link:<br /><a href="${acceptUrl}">${acceptUrl}</a></p><p>Thank you!</p>`;

	await mailjet
		.post("send", { version: "v3.1" })
		.request({
			Messages: [
				{
					From: {
						Email: "invitation@certificates.unternehmertum.de",
						Name: "UnternehmerTUM Certificates",
					},
					To: [
						{
							Email: invite.email,
							Name: `${invite.firstName} ${invite.lastName}`,
						},
					],
					Subject: `You have been invited to UnternehmerTUM Certificates`,
					TextPart: text,
					HTMLPart: html,
				},
			],
		})
		.catch((error) => {
			throw new Response(error.message, {
				status: 500,
				statusText: error.statusCode,
			});
		});

	return true;
};

export async function saveUploadedPhoto(
	userPhoto: UserPhoto,
	userPhotoFile: File,
) {
	const folderCreated = await ensureFolderExists(userPhotoDir);
	if (!folderCreated) {
		throw new Error("Could not create user photo storage folder");
	}

	let extension: "jpg" | "png" | "unkown";
	switch (userPhoto.contentType) {
		case "image/png":
			extension = "png";
			break;
		case "image/jpeg":
			extension = "jpg";
			break;
		default:
			extension = "unkown";
	}

	const buffer = Buffer.from(await userPhotoFile.arrayBuffer());
	return await writeFile(
		`${userPhotoDir}/${userPhoto.id}.${extension}`,
		buffer,
	);
}

export async function saveTransparentPhoto(
	userPhoto: UserPhoto,
	userPhotoBuffer: ArrayBuffer,
) {
	const folderCreated = await ensureFolderExists(userPhotoDir);
	if (!folderCreated) {
		throw new Error("Could not create user photo storage folder");
	}

	const buffer = Buffer.from(userPhotoBuffer);
	return await writeFile(
		`${userPhotoDir}/${userPhoto.id}.transparent.png`,
		buffer,
	);
}

export async function readPhoto(userPhoto: UserPhoto) {
	return await readFileIfExists(
		`${userPhotoDir}/${userPhoto.id}.transparent.png`,
	);
}
