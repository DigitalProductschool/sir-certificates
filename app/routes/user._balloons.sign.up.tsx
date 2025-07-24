import type { Route } from "./+types/user._balloons.sign.up";
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
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { register, getUser } from "~/lib/auth.server";
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
  return null;
}

export default function UserSignUp({ actionData }: Route.ComponentProps) {
  const location = useLocation();
  const [searchParams /*, setSearchParams*/] = useSearchParams();
  const [formData, setFormData] = useState({
    email: actionData?.fields?.email || location.state?.email || "",
    password: actionData?.fields?.password || "",
    firstName:
      actionData?.fields?.lastName || searchParams.get("firstName") || "",
    lastName:
      actionData?.fields?.firstName || searchParams.get("lastName") || "",
  });

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

  // @todo – add password strength indicator to "sign up" pages

  return (
    <Card className="mx-auto w-full max-w-sm shadow-none border-none bg-transparent">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Register</CardTitle>
        <CardDescription className="text-center text-balance">
          Enter your name and email and choose a password to register an account
          and access your certificates.
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
                  formData.email !== "" ? { email: formData.email } : undefined
                }
              >
                Sign In
              </Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
