export const EMAIL_TEMPLATES = {
  "notification": {
    label: "Certificate only",
    description: "For unpublished certificates, with the certificate attached as a PDF.",
  },
  "notification-public": {
    label: "Certificate with website",
    description:
      "For published certificates, with a link to view, sign in, download and share on social media.",
  },
} satisfies Record<string, { label: string; description: string }>;

export type EmailKey = keyof typeof EMAIL_TEMPLATES;

export function isValidEmailKey(key: string | undefined): key is EmailKey {
  return !!key && key in EMAIL_TEMPLATES;
}

export const EMAIL_KEY_VARIABLES: Record<EmailKey, string[]> = {
  "notification": [
    "{certificate.firstName}",
    "{certificate.lastName}",
    "{certificate.fullName}",
    "{batch.name}",
    "{batch.startDate}",
    "{batch.endDate}",
    "{program.name}",
    "{cert.url}",
  ],
  "notification-public": [
    "{certificate.firstName}",
    "{certificate.lastName}",
    "{certificate.fullName}",
    "{batch.name}",
    "{batch.startDate}",
    "{batch.endDate}",
    "{program.name}",
    "{cert.url}",
    "{cert.loginUrl}",
    "{cert.signAction}",
  ],
};

export const EMAIL_DEFAULTS: Record<
  EmailKey,
  { subject: string; htmlBody: string; textBody: string }
> = {
  "notification": {
    subject: "Your certificate from {program.name} is ready",
    textBody:
      "Dear {certificate.firstName},\n\nYour certificate for {program.name} – {batch.name} is ready and the document attached to this email.\n\nAll the best!",
    htmlBody:
      "<p>Dear {certificate.firstName},</p><p>Your certificate for {program.name} – {batch.name} is ready and the document attached to this email.</p><p>All the best!</p>",
  },
  "notification-public": {
    subject: "Your certificate from {program.name} is ready",
    textBody:
      "Dear {certificate.firstName},\n\nYour certificate for {program.name} – {batch.name} is ready for you.\n\n\nDownload your certificate from this link:\n{cert.url}\n\n\nShare your certificate on social media with your personal link:\n1. Sign up to our certificate tool with this email address at the link above\n2. Insert your photo into the social media preview\n3. Share it across your platforms\n\n\nCongratulations!",
    htmlBody:
      "<p>Dear {certificate.firstName},</p><p>Your certificate for {program.name} – {batch.name} is ready for you.</p><p>Download your certificate from this link:<br/><a href=\"{cert.url}\" rel=\"notrack\">{cert.url}</a></p><p>Share your certificate on social media with your personal link:<ol><li><a href=\"{cert.loginUrl}\" rel=\"notrack\">Sign {cert.signAction}</a> to our certificate tool with this email address at the link above</li><li>Insert your photo into the social media preview</li><li>Share it across your platforms</li></ol></p><p>Congratulations!</p><br/>",
  },
};
