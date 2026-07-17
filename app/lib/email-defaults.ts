export const EMAIL_TEMPLATES = {
  "notification": {
    label: "Certificate only",
    description: "For unpublished certificates, with the certificate attached as a PDF.",
    orgOnly: false,
  },
  "notification-public": {
    label: "Certificate with website",
    description:
      "For published certificates, with a link to view, sign in, download and share on social media.",
    orgOnly: false,
  },
  "verify-email": {
    label: "User – Verify Email",
    description: "Sent to a new user to confirm their email address after signing up.",
    orgOnly: true,
  },
  "password-reset": {
    label: "User – Reset Password",
    description: "Sent when a user requests a link to reset their password.",
    orgOnly: true,
  },
  "invite": {
    label: "Admin – Invite Program Manager",
    description: "Sent to invite someone to become a program manager.",
    orgOnly: true,
  },
} satisfies Record<
  string,
  { label: string; description: string; orgOnly: boolean }
>;

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
  "verify-email": [
    "{user.firstName}",
    "{user.lastName}",
    "{user.fullName}",
    "{org.name}",
    "{verify.url}",
  ],
  "password-reset": [
    "{user.firstName}",
    "{user.lastName}",
    "{user.fullName}",
    "{org.name}",
    "{reset.url}",
  ],
  "invite": [
    "{invite.firstName}",
    "{invite.lastName}",
    "{invite.fullName}",
    "{org.name}",
    "{invite.acceptUrl}",
    "{invite.senderName}",
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
  "verify-email": {
    subject: "Please verify your email",
    textBody:
      "Dear {user.fullName},\n\nTo complete your sign up for {org.name} Certificates, please click on the following link:\n{verify.url}\n\nIf you haven't signed up yourself, please ignore or report this email.\n\nThank you!",
    htmlBody:
      "<p>Dear {user.fullName},</p><p>To complete your sign up for {org.name} Certificates, please click on the following link:<br/><a href=\"{verify.url}\">{verify.url}</a></p><p>If you haven't signed up yourself, please ignore or report this email.</p><p>Thank you!</p>",
  },
  "password-reset": {
    subject: "Reset your password",
    textBody:
      "Dear {user.fullName},\n\nTo reset your password for {org.name} Certificates, please click on the following link:\n{reset.url}\n\nIf you haven't requested this password reset, please ignore or report this email.\n\nThank you!",
    htmlBody:
      "<p>Dear {user.fullName},</p><p>To reset your password for {org.name} Certificates, please click on the following link:<br/><a href=\"{reset.url}\">{reset.url}</a></p><p>If you haven't requested this password reset, please ignore or report this email.</p><p>Thank you!</p>",
  },
  "invite": {
    subject: "You have been invited to {org.name} Certificates",
    textBody:
      "Dear {invite.fullName},\n\n{invite.senderName} has invited you to become a program manager for the {org.name} certificates tool.\n\nTo accept the invitation, please click on the following link:\n{invite.acceptUrl}\n\nThank you!",
    htmlBody:
      "<p>Dear {invite.fullName},</p><p>{invite.senderName} has invited you to become a program manager for the {org.name} certificates tool.</p><p>To accept the invitation, please click on the following link:<br/><a href=\"{invite.acceptUrl}\">{invite.acceptUrl}</a></p><p>Thank you!</p>",
  },
};
