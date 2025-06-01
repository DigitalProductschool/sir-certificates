import type { User } from "@prisma/client";
import type { RegisterForm, LoginForm } from "./types";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { redirect, json, createCookieSessionStorage } from "@remix-run/node";
import { domain } from "./config.server";
import { mailjetSend } from "./email.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import { requireAccessToProgram } from "./program.server";
import { createUser } from "./user.server";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
	throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
	cookie: {
		name: "sir-sess",
		secure: process.env.NODE_ENV === "production",
		secrets: [sessionSecret],
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 30,
		httpOnly: true,
	},
});

function getUserSession(request: Request) {
	return storage.getSession(request.headers.get("Cookie"));
}

async function getUserId(request: Request) {
	const session = await getUserSession(request);
	const userId = session.get("userId");
	if (!userId || typeof userId !== "number") return null;
	return userId;
}

export async function register(user: RegisterForm) {
	const emailLowerCase = user.email.toLowerCase();

	const exists = await prisma.user.count({
		where: { email: emailLowerCase },
	});
	if (exists) {
		return json(
			{ error: `User already exists with that email` },
			{ status: 400 },
		);
	}

	const newUser = await createUser(user);
	if (!newUser) {
		return json(
			{
				error: `Something went wrong trying to create a new user.`,
				fields: { email: user.email, password: user.password },
			},
			{ status: 400 },
		);
	}

	return redirect("/user/verification-info");
}

export async function login({ email, password }: LoginForm) {
	const user = await prisma.user.findUnique({
		where: { email: email.toLowerCase() },
	});

	if (!user || !(await bcrypt.compare(password, user.password)))
		return json({ error: `Incorrect login` }, { status: 400 });

	if (!user.isVerified) {
		return json(
			{
				error: `You still need to verify your email address.`,
				errorCode: "verify-email",
			},
			{ status: 400 },
		);
	}

	// @todo support redirectTo parameter from login form
	const redirectTo = user.isAdmin ? "/org/program" : "/";

	return createUserSessionAndRedirect(user, redirectTo);
}

export async function createUserSessionAndRedirect(
	user: User,
	redirectTo: string,
) {
	const session = await storage.getSession();
	session.set("userId", user.id);
	session.set("isAdmin", user.isAdmin);
	return redirect(redirectTo, {
		headers: {
			"Set-Cookie": await storage.commitSession(session),
		},
	});
}

export async function requireUserId(
	request: Request,
	redirectTo: string = new URL(request.url).pathname,
) {
	const session = await getUserSession(request);
	const userId = session.get("userId");

	if (!userId || typeof userId !== "number") {
		if (redirectTo !== "/") {
			const searchParams = new URLSearchParams([
				["redirectTo", redirectTo],
			]);
			throw redirect(`/user/sign/in?${searchParams}`);
		} else {
			throw redirect("/user/sign/in");
		}
	}
	return userId;
}

export async function requireAdmin(
	request: Request,
	redirectTo: string = new URL(request.url).pathname,
) {
	const session = await getUserSession(request);
	const userId = session.get("userId");

	if (!userId || typeof userId !== "number") {
		const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
		throw redirect(`/user/sign/in?${searchParams}`);
	}

	const isAdmin = session.get("isAdmin");
	if (!isAdmin) {
		throw new Response(null, {
			status: 403,
			statusText: "You are not allowed access here.",
		});
	}
	return userId;
}

export async function requireSuperAdmin(
	request: Request,
	redirectTo: string = new URL(request.url).pathname,
) {
	const session = await getUserSession(request);
	const userId = session.get("userId");

	if (!userId || typeof userId !== "number") {
		const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
		throw redirect(`/user/sign/in?${searchParams}`);
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			isAdmin: true,
			isSuperAdmin: true,
		},
	});

	if (!user || !user.isSuperAdmin) {
		throw new Response(null, {
			status: 403,
			statusText: "You are not allowed access here.",
		});
	}

	return user.id;
}

export async function requireAdminWithProgram(
	request: Request,
	programId: number,
) {
	const adminId = await requireAdmin(request);
	return await requireAccessToProgram(adminId, programId);
}

export async function getUser(request: Request) {
	const userId = await getUserId(request);

	if (typeof userId !== "number") {
		// logout(request);
		return null;
	}

	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				isAdmin: true,
				isSuperAdmin: true,
				adminOfPrograms: true,
				photo: true
			},
		});
		return user;
	} catch {
		throw logout(request);
	}
}

export async function logout(request: Request) {
	const session = await getUserSession(request);
	return redirect("/user/sign/in", {
		headers: {
			"Set-Cookie": await storage.destroySession(session),
		},
	});
}

export async function sendPasswordResetLink(user: User) {
	const reset = await prisma.userPasswordReset
		.upsert({
			where: {
				userId: user.id,
			},
			create: {
				user: {
					connect: {
						id: user.id,
					},
				},
				resetCode: randomUUID(),
			},
			update: {
				createdAt: new Date(),
				resetCode: randomUUID(),
			},
		})
		.catch((error) => {
			console.error(error);
			throwErrorResponse(error, "Could not create a reset code");
		});

	if (reset) {
		const resetUrl = `${domain}/user/reset-password/${user.id}/${reset.resetCode}`;

		// @todo dynamic org name (from settings?)
		await mailjetSend({
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
					Subject: `Reset your password`,
					TextPart: `Dear ${user.firstName} ${user.lastName},\n\nTo reset your password for UnternehmerTUM Certificates, please click on the following link:\n${resetUrl}\n\nIf you haven't requested this password reset, please ignore or report this email.\n\nThank you!`,
					HTMLPart: `<p>Dear ${user.firstName} ${user.lastName},</p><p>To reset your password for UnternehmerTUM Certificates, please click on the following link:<br /><a href="${resetUrl}">${resetUrl}</a></p><p>If you haven't requested this password reset, please ignore or report this email.</p><p>Thank you!</p>`,
				},
			],
		}).catch((/*error*/) => {
			// @todo this should be a service-internal error, not user-facing
			/* throw new Response(error.message, {
				status: 500,
				statusText: error.statusCode,
			}); */
		});
	}

	return reset;
}
