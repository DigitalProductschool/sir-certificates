import type { Route } from "./+types/cert.$certUuid.social-preview[.png]";

import { getUser } from "~/lib/auth.server";
import { prisma } from "~/lib/prisma.server";
import { generateSocialPreview } from "~/lib/social.server";

/* Social preview images 

- only if a social preview was configured for the program
- only available for published certificates, except for admins

*/

export async function loader({ params, request }: Route.LoaderArgs) {
  // Does the requested certificate exist?
  const certificate = await prisma.certificate.findUnique({
    where: {
      uuid: params.certUuid,
    },
    include: {
      batch: {
        select: {
          programId: true,
        },
      },
    },
  });

  if (!certificate) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  // Is a social preview configured for the program?
  const social = await prisma.socialPreview.findUnique({
    where: {
      programId: certificate.batch.programId,
    },
  });

  if (!social) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const activeUser = await getUser(request);

  // If the certificate is not yet published and the user is not an admin, we pretend it doesn't exist
  if (
    certificate.publishedAt === null &&
    (!activeUser?.isAdmin || !activeUser?.isSuperAdmin)
  ) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  // Should we integrate a user photo into the preview?
  const user = await prisma.user.findUnique({
    where: {
      email: certificate.email,
    },
    select: {
      id: true,
    },
  });

  const userPhoto = user
    ? await prisma.userPhoto.findUnique({
        where: {
          userId: user.id,
        },
      })
    : null;

  const url = new URL(request.url);
  const withPlaceholder = url.searchParams.get("withPlaceholder")
    ? true
    : false;

  /* @todo Refactor to disk-storage caching, LazyFile and streaming the response */
  const imageBuffer = await generateSocialPreview(
    social,
    certificate,
    userPhoto,
    withPlaceholder,
  );

  if (imageBuffer) {
    // Conversion for Typescript
    const imageBufferArray = new Uint8Array(imageBuffer);

    // @todo add cache headers
    return new Response(imageBufferArray, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
      },
    });
  } else {
    throw new Response(null, {
      status: 404,
      statusText: "File not Found",
    });
  }
}
