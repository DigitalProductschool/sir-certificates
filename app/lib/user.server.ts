import type { User, UserInvitation, UserPhoto } from "@prisma/client";
import type { FileUpload } from "@mjackson/form-data-parser";
import type { RegisterForm, InviteForm, UserAuthenticated } from "./types";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";
import bcrypt from "bcryptjs";
import {
  openFile as lazyOpenFile,
  writeFile as lazyWriteFile,
} from "@mjackson/lazy-file/fs";

import { domain } from "./config.server";
import { mailjetSend } from "./email.server";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import { getOrg } from "./organisation.server";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const userPhotoDir = resolve(__dirname, "../../storage/user/photos");

export const createUser = async (user: RegisterForm) => {
  const emailLowerCase = user.email.toLowerCase();
  const passwordHash = await bcrypt.hash(user.password, 10);
  const verifyCode = randomUUID();
  const newUser = await prisma.user.create({
    data: {
      email: emailLowerCase,
      password: passwordHash,
      firstName: user.firstName,
      lastName: user.lastName,
      verifyCode,
    },
    include: {
      adminOfPrograms: true,
      photo: true
    }
  });

  await sendVerificationEmail(newUser);
  return { id: newUser.id, email: emailLowerCase };
};

export const createUserOAuth = async (
  user: {
    firstName: string;
    lastName: string;
    email: string;
  },
  source: string,
): Promise<UserAuthenticated> => {
  const emailLowerCase = user.email.toLowerCase();
  const verifyCode = randomUUID();

  const userCreated = await prisma.user.create({
    data: {
      email: emailLowerCase,
      password: `oauth:${source}`,
      firstName: user.firstName,
      lastName: user.lastName,
      verifyCode,
      isAdmin: false,
      isSuperAdmin: false,
      isVerified: true,
    },
    include: {
      adminOfPrograms: true,
      photo: true,
    },
  });

  if (userCreated !== null) {
    return userCreated;
  }

  throw new Response("Could not create user", {
    status: 500,
    statusText: "Could not create user",
  });
};

export const changePassword = async (user: User, newPassword: string) => {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: passwordHash,
    },
  });
  return updatedUser;
};

interface UserInvitationSender {
  email: string;
  firstName: string;
  lastName: string;
}

export const createUserInvitation = async (
  user: InviteForm,
  from: UserInvitationSender | null,
) => {
  const verifyCode = randomUUID();
  const emailLowerCase = user.email.toLowerCase();
  const invite = await prisma.userInvitation.create({
    data: {
      email: emailLowerCase,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: true,
      adminOfPrograms: user.adminOfPrograms,
      verifyCode,
    },
  });
  await sendInvitationEmail(invite, from);
  return { id: invite.id, email: emailLowerCase };
};

export const sendVerificationEmail = async (user: User) => {
  const org = await getOrg();
  // @todo test for user-enumeration vulnerability
  const verificationUrl = `${domain}/user/verify/${user.id}/${user.verifyCode}`;

  // @todo dynamic org name (from settings?)
  await mailjetSend({
    Messages: [
      {
        From: {
          Email: org.senderEmail ?? "email-not-configured@example.com",
          Name: org.senderName ?? "Please configure in organisation settings",
        },
        To: [
          {
            Email: user.email,
            Name: `${user.firstName} ${user.lastName}`,
          },
        ],
        Subject: `Please verify your email`,
        TextPart: `Dear ${user.firstName} ${user.lastName},\n\nTo complete your sign up for ${org.name} Certificates, please click on the following link:\n${verificationUrl}\n\nIf you haven't signed up yourself, please ignore or report this email.\n\nThank you!`,
        HTMLPart: `<p>Dear ${user.firstName} ${user.lastName},</p><p>To complete your sign up for ${org.name} Certificates, please click on the following link:<br /><a href="${verificationUrl}">${verificationUrl}</a></p><p>If you haven't signed up yourself, please ignore or report this email.</p><p>Thank you!</p>`,
      },
    ],
  }).catch((error) => {
    throw new Response(error.message, {
      status: 500,
      statusText: error.statusCode,
    });
  });

  return true;
};

export const sendInvitationEmail = async (
  invite: UserInvitation,
  from: UserInvitationSender | null,
) => {
  const org = await getOrg();
  // @todo dynamic org name from database
  const acceptUrl = `${domain}/user/accept-invite/${invite.id}/${invite.verifyCode}`;

  const text = `Dear ${invite.firstName} ${invite.lastName},\n\n${
    from
      ? `${from.firstName} ${from.lastName} is inviting you`
      : "You have been invited"
  } to become an admiminstrator for the ${
    org.name
  } certificates tool.\n\nTo accept the invitation, please click on the following link:\n${acceptUrl}\n\nThank you!`;
  const html = `<p>Dear ${invite.firstName} ${invite.lastName},</p><p>${
    from
      ? `${from.firstName} ${from.lastName} is inviting you`
      : "You have been invited"
  } to become an admiminstrator for the ${
    org.name
  } certificates tool.</p><p>To accept the invitation, please click on the following link:<br /><a href="${acceptUrl}">${acceptUrl}</a></p><p>Thank you!</p>`;

  await mailjetSend({
    Messages: [
      {
        From: {
          Email: org.senderEmail ?? "email-not-configured@example.com",
          Name: org.senderName ?? "Please configure in organisation settings",
        },
        To: [
          {
            Email: invite.email,
            Name: `${invite.firstName} ${invite.lastName}`,
          },
        ],
        Subject: `You have been invited to ${org.name} Certificates`,
        TextPart: text,
        HTMLPart: html,
      },
    ],
  }).catch((error) => {
    throw new Response(error.message, {
      status: 500,
      statusText: error.statusCode,
    });
  });

  return true;
};

export async function saveTransparentPhotoUpload(
  userPhoto: UserPhoto,
  photo: FileUpload,
) {
  const folderCreated = await ensureFolderExists(userPhotoDir);
  if (!folderCreated) {
    throw new Error("Could not create user photo storage folder");
  }

  const filepath = `${userPhotoDir}/${userPhoto.id}.transparent.png`;
  await lazyWriteFile(filepath, photo);
  return lazyOpenFile(filepath);
}

export async function readPhoto(userPhoto: UserPhoto) {
  return await readFileIfExists(
    `${userPhotoDir}/${userPhoto.id}.transparent.png`,
  );
}

export async function deleteUserPhoto(userPhoto: UserPhoto) {
  await unlink(`${userPhotoDir}/${userPhoto.id}.transparent.png`);
  return await prisma.userPhoto
    .delete({
      where: {
        id: userPhoto.id,
      },
    })
    .catch((error) => {
      console.error(error);
      throwErrorResponse(error, "Could not delete user photo");
    });
}
