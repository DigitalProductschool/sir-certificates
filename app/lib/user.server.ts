import type { User } from "@prisma/client";
import type { RegisterForm } from "./types.server";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import Mailjet from "node-mailjet";
import { prisma } from "./prisma.server";

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

export const sendVerificationEmail = async (user: User) => {
	const mailjet = new Mailjet({
		apiKey: process.env.MJ_APIKEY_PUBLIC,
		apiSecret: process.env.MJ_APIKEY_PRIVATE,
	});

	// @todo dynamic domain (from settings?)
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
