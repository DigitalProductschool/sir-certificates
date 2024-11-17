import type { Batch, Certificate } from "@prisma/client";

export function replaceVariables(
	text: string,
	locale: string,
	certificate: Certificate,
	batch: Batch,
) {
	let replacements = text;

	// @todo refactor date formats to be configurable via template settings
	const startDate = batch.startDate.toLocaleString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const endDate = batch.endDate.toLocaleString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const signatureDate = batch.endDate.toLocaleString(locale, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
	});

	// Certificate replacements
	replacements = replacements.replaceAll(
		"{certificate.fullName}",
		`${certificate.firstName} ${certificate.lastName}`,
	);
	replacements = replacements.replaceAll(
		"{certificate.fullNameCaps}",
		`${certificate.firstName.toUpperCase()} ${certificate.lastName.toUpperCase()}`,
	);
	replacements = replacements.replaceAll(
		"{certificate.firstName}",
		certificate.firstName,
	);
	replacements = replacements.replaceAll(
		"{certificate.firstNameCaps}",
		certificate.firstName.toUpperCase(),
	);
	replacements = replacements.replaceAll(
		"{certificate.lastName}",
		certificate.lastName,
	);
	replacements = replacements.replaceAll(
		"{certificate.lastNameCaps}",
		certificate.lastName.toUpperCase(),
	);
	replacements = replacements.replaceAll(
		"{certificate.teamName}",
		certificate.teamName || "",
	);

	// Batch replacements
	replacements = replacements.replaceAll("{batch.name}", batch.name);
	replacements = replacements.replaceAll("{batch.startDate}", startDate);
	replacements = replacements.replaceAll("{batch.endDate}", endDate);
	replacements = replacements.replaceAll(
		"{batch.signatureDate}",
		signatureDate,
	);

	return replacements;
}
