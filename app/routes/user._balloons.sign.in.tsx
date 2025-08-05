/* eslint-disable jsx-a11y/tabindex-no-positive */
import type { Route } from "./+types/user._balloons.sign.in";
import { useEffect, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useSearchParams,
  useLocation,
} from "react-router";
import { FormField } from "~/components/form-field";
import GoogleIcon from "~/components/icons/google-login";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { login, getUser, googleLoginIsConfigured } from "~/lib/auth.server";
import { validateEmail, validatePassword } from "~/lib/validators.server";

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
  const auth = {
    email: true,
    google: googleLoginIsConfigured,
  };
  return { auth };
}

export default function UserSignIn({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const location = useLocation();
  const [searchParams /*, setSearchParams*/] = useSearchParams();
  const [formData, setFormData] = useState({
    email: actionData?.fields?.email || location.state?.email || "",
    password: actionData?.fields?.password || "",
  });

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

  return (
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
                  formData.email !== "" ? { email: formData.email } : undefined
                }
              >
                Sign Up
              </Link>
            </Button>
          </div>
        </Form>
        {loaderData.auth.google && (
          <>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-muted text-muted-foreground relative z-10 px-2">
                or
              </span>
            </div>
            <Form action="/auth/google" method="GET">
              <Button variant="outline" className="w-full">
                <GoogleIcon />
                Continue with Google
              </Button>
            </Form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
