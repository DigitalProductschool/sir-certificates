import type { User } from "@prisma/client";
import type { RegisterForm, LoginForm } from "./types.server";
import bcrypt from "bcryptjs";
import { redirect, json, createCookieSessionStorage } from "@remix-run/node";
import { prisma } from "./prisma.server";
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

	return createUserSessionAndRedirect(user, "/");
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
		const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
		throw redirect(`/user/login?${searchParams}`);
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
		throw redirect(`/user/login?${searchParams}`);
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
			},
		});
		return user;
	} catch {
		throw logout(request);
	}
}

export async function logout(request: Request) {
	const session = await getUserSession(request);
	return redirect("/user/login", {
		headers: {
			"Set-Cookie": await storage.destroySession(session),
		},
	});
}
