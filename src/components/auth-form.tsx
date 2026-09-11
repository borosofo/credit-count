"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type Props = { mode: "login" | "signup"; next?: string };

export function AuthForm({ mode, next }: Props) {
  const isSignup = mode === "signup";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    isSignup ? signUp : signIn,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isSignup ? "Create your account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isSignup
            ? "Start counting the coasters you have ridden."
            : "Sign in to log rides and see your stats."}
        </CardDescription>
      </CardHeader>
      {/* The form sits between header and footer, so it has to carry the Card's own gap. */}
      <form action={formAction} className="flex flex-col gap-6">
        <CardContent>
          <FieldGroup>
            {isSignup && (
              <Field>
                <FieldLabel htmlFor="displayName">Display name</FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  autoComplete="nickname"
                  required
                  minLength={2}
                  maxLength={40}
                  defaultValue={state.values?.displayName}
                />
                <FieldDescription>
                  Shown on the leaderboard if you choose to appear there.
                </FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={state.values?.email}
              />
            </Field>
            <Field data-invalid={state.error ? true : undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={isSignup ? 8 : 1}
                aria-invalid={state.error ? true : undefined}
              />
              {isSignup && <FieldDescription>At least 8 characters.</FieldDescription>}
              {state.error && <FieldError>{state.error}</FieldError>}
            </Field>
            {next && <input type="hidden" name="next" value={next} />}
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {isSignup ? "Create account" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
