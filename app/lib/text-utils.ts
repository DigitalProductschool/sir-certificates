import { Parser as HtmlParser } from "htmlparser2";

import type { CertificateView, CertificateViewBatch } from "./types";

export function applyReplacements(
	text: string,
	replacements: Record<string, string>,
): string {
	let result = text || "";
	for (const [key, value] of Object.entries(replacements)) {
		result = result.replaceAll(`{${key}}`, value);
	}
	return result;
}

export type VariableDef = { placeholder: string; label: string };
export type VariableGroup = { group: string; variables: VariableDef[] };

// Grouped, labeled catalog of the placeholders prepareCertificateReplacements
// substitutes — the single source of truth for both the certificate layout
// editor's "Add variable" menu and the certificate-related email templates.
export const CERTIFICATE_VARIABLE_GROUPS: VariableGroup[] = [
	{
		group: "Certificate",
		variables: [
			{ placeholder: "certificate.fullName", label: "Full Name" },
			{ placeholder: "certificate.firstName", label: "First Name" },
			{ placeholder: "certificate.lastName", label: "Last Name" },
			{ placeholder: "certificate.teamName", label: "Team Name" },
			{ placeholder: "certificate.id", label: "Unique ID" },
			{ placeholder: "certificate.fullNameCaps", label: "FULL NAME" },
			{ placeholder: "certificate.firstNameCaps", label: "FIRST NAME" },
			{ placeholder: "certificate.lastNameCaps", label: "LAST NAME" },
		],
	},
	{
		group: "Batch",
		variables: [
			{ placeholder: "batch.name", label: "Name" },
			{ placeholder: "batch.startDate", label: "Start date" },
			{ placeholder: "batch.endDate", label: "End date" },
			{ placeholder: "batch.signatureDate", label: "Signature date" },
			{ placeholder: "batch.signatureDateLong", label: "Signature date (long)" },
		],
	},
	{
		group: "Date",
		variables: [
			{ placeholder: "datetime.currentDate", label: "Current date" },
			{ placeholder: "datetime.currentMonth", label: "Current month" },
		],
	},
];

export function prepareCertificateReplacements(
	certificate: CertificateView,
	batch: CertificateViewBatch,
	locale: string,
): Record<string, string> {
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

	return {
		"certificate.fullName": `${certificate.firstName || ""} ${certificate.lastName || ""}`,
		"certificate.fullNameCaps": `${certificate.firstName.toUpperCase() || ""} ${
			certificate.lastName?.toUpperCase() || ""
		}`,
		"certificate.firstName": certificate.firstName || "",
		"certificate.firstNameCaps": certificate.firstName.toUpperCase() || "",
		"certificate.lastName": certificate.lastName || "",
		"certificate.lastNameCaps": certificate.lastName?.toUpperCase() || "",
		"certificate.teamName": certificate.teamName || "",
		"certificate.id": certificate.uuid || "",
		"batch.name": batch.name || "",
		"batch.startDate": startDate,
		"batch.endDate": endDate,
		"batch.signatureDate": signatureDate,
		"batch.signatureDateLong": signatureDateLong,
		"datetime.currentDate": currentDate,
		"datetime.currentMonth": currentMonth,
	};
}

export function replaceVariables(
	text: string,
	certificate: CertificateView,
	batch: CertificateViewBatch,
	locale: string = "de-DE",
) {
	return applyReplacements(
		text,
		prepareCertificateReplacements(certificate, batch, locale),
	);
}

// List of self-closing tags, used to filter validation issues and improve HTML pretty formatting
export const SELF_CLOSING = new Set([
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
			(/\/>$/.test(token) ||
				(tagName !== undefined && SELF_CLOSING.has(tagName)));

		if (isClosingTag) depth = Math.max(0, depth - 1);

		lines.push("  ".repeat(depth) + token.trim());

		if (isOpeningTag && !isSelfClosing) depth += 1;
	}

	return lines.join("\n");
}

// Check if HTML is well-formed and has matching open/close tags.
export function checkWellFormedHtml(html: string): string[] {
	const errors: string[] = [];
	const parser = new HtmlParser({
		onopentag(name, _attribs, isImplied) {
			if (isImplied) {
				errors.push(
					`A misplaced or unexpected closing tag required inserting a missing \`<${name}>\` opening tag`,
				);
			}
		},
		onclosetag(name, isImplied) {
			if (isImplied && !SELF_CLOSING.has(name)) {
				errors.push(`\`<${name}>\` is never closed`);
			}
		},
	});
	parser.end(html);
	return errors;
}
