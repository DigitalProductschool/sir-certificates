import { z } from "zod";

// Note on email validation: the default RegEx from Zod is relatively strict and doesn't allow for international/UTF-8 characters in email addresses, that's why we're opting for the looser Unicode pattern
// See more here: https://zod.dev/api?id=emails

export const RegisterSchema = z.object({
	email: z
		.string("Please enter an email address")
		.min(1, { message: "Please enter an email address" })
		.email({
			pattern: z.regexes.unicodeEmail,
			message: "This email looks incomplete",
		})
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
		.email({
			pattern: z.regexes.unicodeEmail,
			message: "This email looks incomplete",
		})
		.toLowerCase(),
	password: z.string("Please enter a password").trim(),
});

export const EmailSchema = z.object({
	email: z
		.string("Please enter an email address")
		.min(1, { message: "Please enter an email address" })
		.email({
			pattern: z.regexes.unicodeEmail,
			message: "This email looks incomplete",
		})
		.toLowerCase(),
});

export const CertificateInputSchema = z.object({
	firstName: z
		.string("Please provide at least a first name")
		.min(1, { message: "Please provide at least a first name" }),
	lastName: z.string().optional().nullable(),
	email: z
		.string("Please enter an email address")
		.min(1, { message: "Please enter an email address" })
		.email({
			pattern: z.regexes.unicodeEmail,
			message: "This email looks incomplete",
		})
		.toLowerCase(),
	teamName: z.string().optional().nullable(),
	templateId: z.int(),
});
