"use client";

import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { useActionState, useState } from "react";

import { LanguageOptions } from "@/components/i18n/language-options";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { signInAction, signUpAction } from "@/lib/actions/auth";
import type { Role } from "@/lib/domain";
import { IDLE, type ActionState } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";
type SignupRole = Exclude<Role, "ADMIN">;

const ROLE_OPTIONS: { value: SignupRole; label: string; hint: string }[] = [
  { value: "FARMER", label: "Farmer / producer", hint: "I sell what I grow" },
  { value: "BUYER", label: "Buyer / business", hint: "I buy for retail, kitchen or trade" },
  { value: "TRANSPORTER", label: "Transporter", hint: "I move produce between mandis" },
];

/** Google's own words are for developers; these are the ones a person can act on. */
const OAUTH_ERRORS: Record<string, string> = {
  "google-not-configured":
    "Google sign-in is not set up on this deployment yet. Use your email and password.",
  cancelled: "Google sign-in was cancelled.",
  expired: "That Google sign-in took too long. Please try again.",
  state: "That Google sign-in could not be verified. Please try again.",
  "no-code": "Google did not return an authorisation code. Please try again.",
  exchange: "Google did not complete the sign-in. Please try again.",
  profile: "Google did not share a usable profile. Please try another account.",
  "email-unverified":
    "Google has not verified that email address, so it cannot be used to sign in here.",
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AuthForm({
  initialMode,
  initialRole,
  next,
  googleEnabled,
  oauthError,
}: {
  initialMode: Mode;
  initialRole: SignupRole;
  next?: string;
  /** False when GOOGLE_CLIENT_ID / SECRET are missing, so the button is honest. */
  googleEnabled: boolean;
  /** `?error=` code handed back by the Google callback. */
  oauthError?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  const [signInState, signIn, signingIn] = useActionState(signInAction, IDLE as ActionState);
  const [signUpState, signUp, signingUp] = useActionState(signUpAction, IDLE as ActionState);
  const [role, setRole] = useState<SignupRole>(initialRole);
  const { locale } = useLocale();

  const state = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signingIn : signingUp;
  const oauthMessage = oauthError ? OAUTH_ERRORS[oauthError] : null;

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-1 rounded-[5px] border border-ivory-300 bg-ivory-200/70 p-0.5">
        {(["signin", "signup"] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "flex-1 rounded-[3px] px-3 py-1.5 text-[13px] font-medium transition-colors",
              mode === value
                ? "bg-white text-charcoal shadow-[var(--shadow-e1)]"
                : "text-charcoal-500 hover:text-charcoal",
            )}
            aria-pressed={mode === value}
          >
            {value === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {oauthMessage ? (
        <p
          role="alert"
          className="mb-4 rounded-[5px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12.5px] leading-relaxed text-danger"
        >
          {oauthMessage}
        </p>
      ) : null}

      {googleEnabled ? (
        <>
          <a
            href={`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-[5px] border border-ivory-300 bg-white px-4 py-2.5 text-[13.5px] font-medium text-charcoal transition-colors hover:border-forest/30 hover:bg-ivory-200/40"
          >
            <GoogleMark />
            Continue with Google
          </a>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-ivory-300" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-charcoal-400">
              or
            </span>
            <span className="h-px flex-1 bg-ivory-300" aria-hidden />
          </div>
        </>
      ) : null}

      {state.message ? (
        <p
          role="alert"
          className="mb-4 rounded-[5px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12.5px] leading-relaxed text-danger"
        >
          {state.message}
        </p>
      ) : null}

      {mode === "signin" ? (
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Email address" htmlFor="signin-email" error={state.errors?.email?.[0]} required>
            <Input
              id="signin-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </Field>
          <Field label="Password" htmlFor="signin-password" error={state.errors?.password?.[0]} required>
            <Input
              id="signin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              required
            />
          </Field>
          <div className="-mt-1 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-forest-700 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={pending}
            icon={<ArrowRight className="size-4" />}
          >
            Sign in
          </Button>
        </form>
      ) : (
        <form action={signUp} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-charcoal">I am a…</legend>
            <div className="grid gap-1.5">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-[5px] border px-3 py-2 transition-colors",
                    role === option.value
                      ? "border-forest/45 bg-forest-50"
                      : "border-ivory-300 bg-white hover:border-sage-200",
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="size-3.5 accent-[var(--color-forest)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-charcoal">
                      {option.label}
                    </span>
                    <span className="block text-[11px] text-charcoal-400">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="signup-name" error={state.errors?.name?.[0]} required>
              <Input
                id="signup-name"
                name="name"
                autoComplete="name"
                placeholder="Gurpreet Singh"
                required
              />
            </Field>
            <Field label="Preferred language" htmlFor="signup-language" required>
              <Select id="signup-language" name="language" defaultValue={locale}>
                <LanguageOptions />
              </Select>
            </Field>
          </div>

          <Field label="Email address" htmlFor="signup-email" error={state.errors?.email?.[0]} required>
            <Input
              id="signup-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field
            label="Mobile number"
            htmlFor="signup-phone"
            error={state.errors?.phone?.[0]}
            hint="Used only to coordinate a delivery — never shown publicly"
            required
          >
            <div className="flex">
              <span className="inline-flex items-center rounded-l-[5px] border border-r-0 border-ivory-300 bg-ivory px-2.5 text-[13px] text-charcoal-500">
                +91
              </span>
              <Input
                id="signup-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98100 00000"
                className="rounded-l-none"
                required
              />
            </div>
          </Field>

          <Field
            label="Password"
            htmlFor="signup-password"
            hint="8+ characters"
            error={state.errors?.password?.[0]}
            required
          >
            <Input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={pending}
            icon={<UserRound className="size-4" />}
          >
            Create account
          </Button>
        </form>
      )}

      <p className="mt-5 text-center text-[11px] leading-relaxed text-charcoal-400">
        By continuing you agree that no payments are processed and listings are moderated, not
        certified.
      </p>
    </div>
  );
}
