/* eslint-disable jsx-a11y/tabindex-no-positive */
import type { Route } from "./+types/user.sign.in";
import { useEffect, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useSearchParams,
  useLocation,
} from "react-router";
import { CheckIcon } from "lucide-react";
import { Balloons } from "~/components/balloons.client";
import { FormField } from "~/components/form-field";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useIsMobile } from "~/hooks/use-mobile";
import { login, getUser } from "~/lib/auth.server";
import { validateEmail, validatePassword } from "~/lib/validators.server";
import { getPublicOrg } from "~/lib/organisation.server";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = form.get("email");
  const password = form.get("password");

  // @todo improve type signature of action errors
  if (typeof email !== "string" || typeof password !== "string") {
    return data(
      {
        error: `Invalid Form Data`,
        errors: undefined,
        errorCode: undefined,
        fields: undefined,
      },
      { status: 400 },
    );
  }

  const errors = {
    email: validateEmail(email),
    password: validatePassword(password),
  };

  if (Object.values(errors).some(Boolean))
    return data(
      {
        error: undefined,
        errors,
        errorCode: undefined,
        fields: { email, password },
      },
      { status: 400 },
    );

  return await login({ email, password });
}

export async function loader({ request }: Route.LoaderArgs) {
  // If there's already a user in the session, redirect to the home page
  const user = await getUser(request);
  if (user) return redirect("/");

  // @todo refactor to routeLoaderData
  const org = await getPublicOrg();
  return { org };
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `${data?.org?.name} Certificates` },
    {
      name: "description",
      content: `All of your certificates from ${
        data?.org?.name || "this organisation"
      } in one place.`,
    },
  ];
}

export default function UserSignIn({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const location = useLocation();
  const { org } = loaderData;
  const [searchParams /*, setSearchParams*/] = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [formData, setFormData] = useState({
    email: actionData?.fields?.email || location.state?.email || "",
    password: actionData?.fields?.password || "",
  });

  const isMobile = useIsMobile();

  const formError = actionData?.error;
  const formErrorCode = actionData?.errorCode;

  // Updates the form data when an input changes
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: string,
  ) => {
    setFormData((form) => ({ ...form, [field]: event.target.value }));
  };

  useEffect(() => {
    if (searchParams.get("email")) {
      setFormData({
        ...formData,
        email: searchParams.get("email"),
      });
    }
  }, [searchParams, formData]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="h-screen grid grid-cols-2">
      {!isMobile && (
        <div className="relative h-screen bg-zinc-900">
          {isClient && <Balloons />}
          <div className="absolute top-8 inset-x-8 flex text-white items-center">
            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-12 invert"
              role="presentation"
            />
            &emsp;
            <span className="text-3xl font-bold tracking-wide">
              Certificates
            </span>
          </div>
          <div className="absolute bottom-4 inset-x-8 text-xs text-muted-foreground/50 italic">
            &ldquo;Balloons&rdquo; adapted from{" "}
            <a
              href="https://codesandbox.io/p/sandbox/5w35n6"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Poimandres
            </a>
          </div>
        </div>
      )}
      <div
        className={`h-screen flex flex-col items-center justify-center px-4 dark:bg-black ${
          isMobile ? "col-span-2" : ""
        }`}
      >
        {searchParams.get("verification") === "done" && (
          <div className="absolute top-10 flex mx-8 p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
            <CheckIcon /> Email successfully verified. You can now sign in.
          </div>
        )}

        {searchParams.get("reset") === "done" && (
          <div className="absolute top-10 flex mx-8 p-2 px-4 gap-2 rounded-xl bg-green-600 text-primary-foreground">
            <CheckIcon /> Your password has been changed. You can now sign in
            with your new password.
          </div>
        )}

        <div className="grow"></div>
        {isMobile && (
          <>
            <img
              src={`/logo/org.svg`}
              alt=""
              className="size-12 fill-current"
              role="presentation"
            />
          </>
        )}
        <Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center text-balance">
              Enter your email and password below to log in to your account and
              access your certificates.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {formError && (
              <div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2">
                {formError}
                {formErrorCode && formErrorCode === "verify-email" && (
                  <Form action="/user/verification/resend" method="POST">
                    <input type="hidden" name="email" value={formData.email} />
                    <Button variant="outline" size="sm" type="submit">
                      Resend email
                    </Button>
                  </Form>
                )}
              </div>
            )}
            <Form method="POST">
              <FormField
                htmlFor="email"
                label="Email"
                value={formData.email}
                onChange={(e) => handleInputChange(e, "email")}
                error={actionData?.errors?.email}
                tabindex={1}
              />
              <FormField
                htmlFor="password"
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) => handleInputChange(e, "password")}
                error={actionData?.errors?.password}
                tabindex={2}
                hint={
                  <Link
                    to={`/user/forgot-password${
                      formData.email !== "" ? `?email=${formData.email}` : ""
                    }`}
                    className="ml-auto inline-block text-sm underline"
                    tabIndex={4}
                  >
                    Forgot your password?
                  </Link>
                }
              />

              <Button type="submit" className="w-full" tabIndex={3}>
                Sign In
              </Button>

              <div className="mt-4 text-center text-sm">
                Don&rsquo;t have an account?
                <Button
                  type="button"
                  variant="link"
                  className="underline"
                  tabIndex={5}
                  asChild
                >
                  <Link
                    to={"/user/sign/up" /* @todo add supportfor redirectTo */}
                    state={
                      formData.email !== ""
                        ? { email: formData.email }
                        : undefined
                    }
                  >
                    Sign Up
                  </Link>
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
        <div className="grow flex flex-row justify-center items-end gap-4 pb-5 text-xs">
          {org?.imprintUrl && (
            <a href={org.imprintUrl} target="_blank" rel="noopener noreferrer">
              Imprint
            </a>
          )}
          {org?.privacyUrl && (
            <a href={org.privacyUrl} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
