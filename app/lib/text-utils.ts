import type { CertificateView, CertificateViewBatch } from "./types";

export function replaceVariables(
	text: string,
	locale: string = "de-DE",
	certificate: CertificateView,
	batch: CertificateViewBatch,
) {
	let replacements = text || "";

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
	const signatureDateLong = batch.endDate.toLocaleString(locale, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const currentDate = new Date().toLocaleString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	const currentMonth = new Date().toLocaleString(locale, {
		year: "numeric",
		month: "long",
	});

	// Certificate replacements
	replacements = replacements.replaceAll(
		"{certificate.fullName}",
		`${certificate.firstName || ""} ${certificate.lastName || ""}`,
	);
	replacements = replacements.replaceAll(
		"{certificate.fullNameCaps}",
		`${certificate.firstName.toUpperCase() || ""} ${
			certificate.lastName?.toUpperCase() || ""
		}`,
	);
	replacements = replacements.replaceAll(
		"{certificate.firstName}",
		certificate.firstName || "",
	);
	replacements = replacements.replaceAll(
		"{certificate.firstNameCaps}",
		certificate.firstName.toUpperCase() || "",
	);
	replacements = replacements.replaceAll(
		"{certificate.lastName}",
		certificate.lastName || "",
	);
	replacements = replacements.replaceAll(
		"{certificate.lastNameCaps}",
		certificate.lastName?.toUpperCase() || "",
	);
	replacements = replacements.replaceAll(
		"{certificate.teamName}",
		certificate.teamName || "",
	);
	replacements = replacements.replaceAll(
		"{certificate.id}",
		certificate.uuid || "",
	);

	// Batch replacements
	replacements = replacements.replaceAll("{batch.name}", batch.name || "");
	replacements = replacements.replaceAll("{batch.startDate}", startDate);
	replacements = replacements.replaceAll("{batch.endDate}", endDate);
	replacements = replacements.replaceAll(
		"{batch.signatureDate}",
		signatureDate,
	);
	replacements = replacements.replaceAll(
		"{batch.signatureDateLong}",
		signatureDateLong,
	);
	replacements = replacements.replaceAll(
		"{datetime.currentDate}",
		currentDate,
	);
	replacements = replacements.replaceAll(
		"{datetime.currentMonth}",
		currentMonth,
	);

	return replacements;
}

const VOID_ELEMENTS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

export function prettyPrintHtml(html: string): string {
	const tokens = html
		.trim()
		.replace(/>\s+</g, "><")
		.split(/(<[^>]+>)/)
		.filter((token) => token.trim() !== "");

	let depth = 0;
	const lines: string[] = [];

	for (const token of tokens) {
		const isClosingTag = /^<\/\w/.test(token);
		const isOpeningTag = /^<\w/.test(token) && !isClosingTag;
		const tagName = token.match(/^<\/?(\w+)/)?.[1]?.toLowerCase();
		const isSelfClosing =
			isOpeningTag &&
			(/\/>$/.test(token) || (tagName !== undefined && VOID_ELEMENTS.has(tagName)));

		if (isClosingTag) depth = Math.max(0, depth - 1);

		lines.push("  ".repeat(depth) + token.trim());

		if (isOpeningTag && !isSelfClosing) depth += 1;
	}

	return lines.join("\n");
}
