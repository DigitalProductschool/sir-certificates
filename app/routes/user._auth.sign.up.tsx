import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import type { Route } from "./+types/user._auth.sign.up";
import {
  Form,
  Link,
  redirect,
  useSearchParams,
  useLocation,
  useNavigation,
} from "react-router";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { LoaderCircle } from "lucide-react";

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

import { RegisterSchema as schema } from "~/lib/schemas";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  return await register(formData); // also handles validation and errors
}

export async function loader({ request }: Route.LoaderArgs) {
  // If there's already a user in the session, redirect to the home page
  const user = await getUser(request);
  if (user) return redirect("/");
  return null;
}

export default function UserSignUp({ actionData }: Route.ComponentProps) {
  const location = useLocation();
  const navigation = useNavigation();
  const [searchParams /*, setSearchParams*/] = useSearchParams();
  const paramEmail = searchParams.get("email");
  const paramFirstName = searchParams.get("firstName");
  const paramLastName = searchParams.get("lastName");

  const email =
    actionData?.initialValue?.email.toString() ||
    location.state?.email ||
    paramEmail ||
    "";
  const firstName =
    actionData?.initialValue?.firstName.toString() || paramFirstName || "";
  const lastName =
    actionData?.initialValue?.lastName.toString() || paramLastName || "";

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(schema),
    defaultValue: { email, firstName, lastName },
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema,
      });
    },
  });

  const isSubmitting = navigation.formAction === "/user/sign/up";

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
        <Form method="POST" {...getFormProps(form)} className="grid gap-4">
          {form.errors && (
            <div
              id={form.errorId}
              className="w-full font-semibold text-sm tracking-wide text-red-500 border border-red-500 rounded p-2 flex flex-col justify-center items-center gap-2"
            >
              {form.errors}
            </div>
          )}
          <FormField
            {...getInputProps(fields.email, { type: "email" })}
            label="Email"
            error={fields.email.errors?.join(", ")}
          />
          <FormField
            {...getInputProps(fields.password, { type: "password" })}
            label="Password"
            error={fields.password.errors?.join(", ")}
          />
          <FormField
            {...getInputProps(fields.firstName, { type: "text" })}
            label="First name"
            error={fields.firstName.errors?.join(", ")}
          />
          <FormField
            {...getInputProps(fields.lastName, { type: "text" })}
            label="Last name"
            error={fields.lastName.errors?.join(", ")}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="mr-2 animate-spin" />}
            Sign Up
          </Button>

          <div className="mt-4 text-center text-sm">
            Already got an account?
            <Button type="button" variant="link" className="underline">
              <Link
                to={"/user/sign/in" /* @todo add supportfor redirectTo */}
                state={
                  fields.email.value !== ""
                    ? { email: fields.email.value }
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
  );
}
