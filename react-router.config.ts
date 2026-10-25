import type { Config } from "@react-router/dev/config";

// Dokku's nginx terminates TLS and forwards plain HTTP, and react-router-serve
// does not enable Express' `trust proxy` — so since react-router 7.18.0 the CSRF
// check compares the browser's https Origin against an http request URL and
// rejects every action with 400. Matching here is on host only, which is what
// makes the scheme mismatch stop mattering.
export default {
  allowedActionOrigins: [
    "certificates.unternehmertum.de",
    "*.utum-certs.dpschool.app", // pre-<PR number> preview apps
  ],
} satisfies Config;
