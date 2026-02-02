import { z } from "zod";

export const RegisterSchema = z.object({
	email: z
		.string("Please enter an email address")
		.min(1, { message: "Please enter an email address" })
		.email("This email looks incomplete")
		.toLowerCase(),
	password: z
		.string("Please enter a password")
		.trim()
		.min(8, "Should be at least 8 characters"),
	firstName: z.string("Please enter your first name (given name)").trim(),
	lastName: z.string("Please enter your last name (family name)").trim(),
});

export const LoginSchema = z.object({
	email: z
		.string("Please enter an email address")
		.min(1, { message: "Please enter an email address" })
		.email("This email looks incomplete")
		.toLowerCase(),
	password: z.string("Please enter a password").trim(),
});

