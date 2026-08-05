import type { CertificateView, CertificateViewBatch, ProgramView } from "./types";
import type { EmailKey } from "./email-templates";

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

export function prepareProgramReplacements(
	program: ProgramView,
): Record<string, string> {
	return {
		"program.name": program.name || "",
		"program.about": program.about || "",
		"program.achievement": program.achievement || "",
		"program.website": program.website || "",
	};
}

export function replaceVariables(
	text: string,
	certificate: CertificateView,
	batch: CertificateViewBatch,
	locale: string = "de-DE",
	program?: ProgramView,
) {
	return applyReplacements(text, {
		...prepareCertificateReplacements(certificate, batch, locale),
		...(program ? prepareProgramReplacements(program) : {}),
	});
}

export const EMAIL_KEY_VARIABLE_GROUPS: Record<EmailKey, VariableGroup[]> = {
  "notification": [
    ...CERTIFICATE_VARIABLE_GROUPS,
    {
      group: "Program & Links",
      variables: [
        { placeholder: "program.name", label: "Program name" },
        { placeholder: "cert.url", label: "Certificate link" },
      ],
    },
  ],
  "notification-public": [
    ...CERTIFICATE_VARIABLE_GROUPS,
    {
      group: "Program & Links",
      variables: [
        { placeholder: "program.name", label: "Program name" },
        { placeholder: "cert.url", label: "Certificate link" },
        { placeholder: "cert.loginUrl", label: "Sign in link" },
        { placeholder: "cert.signAction", label: "Sign action (in/up)" },
      ],
    },
  ],
  "verify-email": [
    {
      group: "User",
      variables: [
        { placeholder: "user.firstName", label: "First name" },
        { placeholder: "user.lastName", label: "Last name" },
        { placeholder: "user.fullName", label: "Full name" },
        { placeholder: "verify.url", label: "Verification link" },
      ],
    },
    {
      group: "Organisation",
      variables: [
        { placeholder: "org.name", label: "Organisation name" },
      ],
    },
  ],
  "password-reset": [
    {
      group: "User",
      variables: [
        { placeholder: "user.firstName", label: "First name" },
        { placeholder: "user.lastName", label: "Last name" },
        { placeholder: "user.fullName", label: "Full name" },
        { placeholder: "reset.url", label: "Reset link" },
      ],
    },
    {
      group: "Organisation",
      variables: [
        { placeholder: "org.name", label: "Organisation name" },
      ],
    },
  ],
  "invite": [
    {
      group: "Invite",
      variables: [
        { placeholder: "invite.firstName", label: "First name" },
        { placeholder: "invite.lastName", label: "Last name" },
        { placeholder: "invite.fullName", label: "Full name" },
        { placeholder: "invite.senderName", label: "Sender name" },
        { placeholder: "invite.acceptUrl", label: "Accept link" },
      ],
    },
    {
      group: "Organisation",
      variables: [
        { placeholder: "org.name", label: "Organisation name" },
      ],
    },
  ],
};

// Flags `{variable}` placeholders that aren't in EMAIL_KEY_VARIABLE_GROUPS for this template key.
export function checkUnknownVariables(key: EmailKey, texts: string[]): string[] {
  const known = new Set(
    EMAIL_KEY_VARIABLE_GROUPS[key].flatMap((g) =>
      g.variables.map((v) => `{${v.placeholder}}`),
    ),
  );
  const unknown = new Set<string>();

  for (const text of texts) {
    for (const [placeholder] of text.matchAll(/\{[\w.]+\}/g)) {
      if (!known.has(placeholder)) unknown.add(placeholder);
    }
  }

  return [...unknown].map(
    (placeholder) => `\`${placeholder}\` is not an available variable for this email`,
  );
}
