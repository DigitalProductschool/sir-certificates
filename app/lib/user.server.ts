import type {
  User,
  UserInvitation,
  UserPhoto,
} from "~/generated/prisma/client";
import type { FileUpload } from "@remix-run/form-data-parser";
import type { InviteForm, UserAuthenticated } from "./types";
import type { RegisterSchemaType } from "./schemas";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unlink } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { openLazyFile, writeFile as lazyWriteFile } from "@remix-run/fs";

import { domain } from "./config.server";
import { sendTemplatedEmail } from "./email.server";
import { ensureFolderExists, readFileIfExists } from "./fs.server";
import { prisma, throwErrorResponse } from "./prisma.server";
import { getOrg } from "./organisation.server";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const userPhotoDir = resolve(__dirname, "../../storage/user/photos");

export const backgroundRemovalIsConfigured: boolean = process.env
  .BACKGROUND_REMOVAL_URL
  ? true
  : false;

export const createUser = async (user: RegisterSchemaType) => {
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
      photo: true,
    },
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

  await sendTemplatedEmail(
    "verify-email",
    { email: user.email, name: `${user.firstName} ${user.lastName}` },
    {
      "user.firstName": user.firstName,
      "user.lastName": user.lastName,
      "user.fullName": `${user.firstName} ${user.lastName}`,
      "org.name": org.name,
      "verify.url": verificationUrl,
    },
  ).catch((error) => {
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
  const acceptUrl = `${domain}/user/accept-invite/${invite.id}/${invite.verifyCode}`;

  await sendTemplatedEmail(
    "invite",
    { email: invite.email, name: `${invite.firstName} ${invite.lastName}` },
    {
      "invite.firstName": invite.firstName,
      "invite.lastName": invite.lastName,
      "invite.fullName": `${invite.firstName} ${invite.lastName}`,
      "org.name": org.name,
      "invite.acceptUrl": acceptUrl,
      "invite.senderName": from ? `${from.firstName} ${from.lastName}` : org.name,
    },
  ).catch((error) => {
    throw new Response(error.message, {
      status: 500,
      statusText: error.statusCode,
    });
  });

  return true;
};

export async function getSuperAdmins() {
  return await prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: { firstName: true, lastName: true, email: true },
    orderBy: { firstName: "asc" },
  });
}

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
  return openLazyFile(filepath);
}

export async function readPhoto(userPhoto: UserPhoto) {
  return await readFileIfExists(
    `${userPhotoDir}/${userPhoto.id}.transparent.png`,
  );
}

export async function deleteUserPhoto(userPhoto: UserPhoto) {
  await unlink(`${userPhotoDir}/${userPhoto.id}.transparent.png`).catch(
    (error) => {
      console.error(
        `Encountered the following error when trying to delete the transparent photo file in storage for UserPhoto ID ${userPhoto.id}:`,
      );
      console.error(error);
    },
  );
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
