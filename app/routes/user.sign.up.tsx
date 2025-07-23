import type { Route } from "./+types/user.sign.up";
import { useEffect, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useSearchParams,
  useLocation,
} from "react-router";
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
import { register, getUser } from "~/lib/auth.server";
import { getPublicOrg } from "~/lib/organisation.server";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "~/lib/validators.server";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = form.get("email");
  const password = form.get("password");
  const firstName = form.get("firstName");
  const lastName = form.get("lastName");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof firstName !== "string" ||
    typeof lastName !== "string"
  ) {
    // @todo improve type signature of action errors
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
    firstName: validateName((firstName as string) || ""),
    lastName: validateName((lastName as string) || ""),
  };

  if (Object.values(errors).some(Boolean))
    // @todo improve type signature of action errors
    return data(
      {
        error: undefined,
        errors,
        errorCode: undefined,
        fields: { email, password, firstName, lastName },
      },
      { status: 400 },
    );

  return await register({ email, password, firstName, lastName });
}

export async function loader({ request }: Route.LoaderArgs) {
  // If there's already a user in the session, redirect to the home page
  const user = await getUser(request);
  if (user) return redirect("/");

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

export default function UserSignUp({
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
    firstName:
      actionData?.fields?.lastName || searchParams.get("firstName") || "",
    lastName:
      actionData?.fields?.firstName || searchParams.get("lastName") || "",
  });

  const isMobile = useIsMobile();
  const formError = actionData?.error;

  // Updates the form data when an input changes
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    field: string,
  ) => {
    setFormData((form) => ({ ...form, [field]: event.target.value }));
  };

  useEffect(() => {
    if (searchParams.get("email")) {
      setFormData((formData) => {
        return {
          ...formData,
          email: searchParams.get("email"),
        };
      });
    }
  }, [searchParams]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // @todo – add password strength indicator to "sign up" pages

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
        <div className="grow"></div>
        {isMobile && (
          <img
            src={`/logo/org.svg`}
            alt=""
            className="size-12"
            role="presentation"
          />
        )}
        <Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Register</CardTitle>
            <CardDescription className="text-center text-balance">
              Enter your name and email and choose a password to register an
              account and access your certificates.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            {formError && (
              <div className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2">
                {formError}
              </div>
            )}
            <Form method="POST">
              <FormField
                htmlFor="email"
                label="Email"
                value={formData.email}
                onChange={(e) => handleInputChange(e, "email")}
                error={actionData?.errors?.email}
              />
              <FormField
                htmlFor="password"
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) => handleInputChange(e, "password")}
                error={actionData?.errors?.password}
              />
              <FormField
                htmlFor="firstName"
                label="First Name"
                onChange={(e) => handleInputChange(e, "firstName")}
                value={formData.firstName}
                error={actionData?.errors?.firstName}
              />
              <FormField
                htmlFor="lastName"
                label="Last Name"
                onChange={(e) => handleInputChange(e, "lastName")}
                value={formData.lastName}
                error={actionData?.errors?.lastName}
              />

              <Button type="submit" className="w-full">
                Sign Up
              </Button>

              <div className="mt-4 text-center text-sm">
                Already got an account?
                <Button type="button" variant="link" className="underline">
                  <Link
                    to={"/user/sign/in" /* @todo add supportfor redirectTo */}
                    state={
                      formData.email !== ""
                        ? { email: formData.email }
                        : undefined
                    }
                  >
                    Sign In
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
