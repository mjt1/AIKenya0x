"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthToken } from "@/lib/auth-context";
import { useLogin } from "@/hooks/mutations/use-login";
import { ApiError } from "@/lib/api";
import { Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function LoginPage() {
  const router = useRouter();
  const { token, isHydrated } = useAuthToken();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Leave the login screen.
  useEffect(() => {
    if (isHydrated && token) router.replace("/");
  }, [isHydrated, token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email: email.trim(), password });
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 401
            ? "Incorrect email or password."
            : err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between bg-primary-dark p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container text-lg font-bold text-on-primary-container">
            S
          </span>
          <span className="text-lg font-bold tracking-tight">Suluhu</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Field intelligence for extension agents.
          </h1>
          <p className="mt-4 text-white/70">
            Capture a visit, see who needs you next, and get grounded, cited
            advice — across every farmer in your caseload.
          </p>
        </div>
        <p className="text-sm text-white/50">
          DigiCow Africa · Sugarcane &amp; Dairy · Western Kenya
        </p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-lg font-bold text-on-primary">
              S
            </span>
          </div>
          <Text variant="h2">Sign in</Text>
          <Text variant="muted" className="mt-1.5">
            Welcome back. Sign in to reach your caseload.
          </Text>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            {error ? (
              <div
                role="alert"
                className="rounded-md border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
              >
                {error}
              </div>
            ) : null}

            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="asha@digicow.co.ke"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth loading={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <Text
            variant="caption"
            as="p"
            className="mt-6 rounded-md bg-surface-muted px-3 py-2"
          >
            Demo account —{" "}
            <span className="font-medium text-foreground">asha@digicow.co.ke</span>{" "}
            / <span className="font-medium text-foreground">changeme123</span>
          </Text>
        </div>
      </section>
    </div>
  );
}
