"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { completePhoneAuthAction, signInAction, signUpAction } from "@/lib/actions/auth";
import { IDLE, type ActionState } from "@/lib/schemas";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/domain";

type Mode = "signin" | "signup";
type SignupRole = Exclude<Role, "ADMIN">;

const ROLE_OPTIONS: { value: SignupRole; label: string; hint: string }[] = [
  { value: "FARMER", label: "Farmer / producer", hint: "I sell what I grow" },
  { value: "BUYER", label: "Buyer / business", hint: "I buy for retail, kitchen or trade" },
  { value: "TRANSPORTER", label: "Transporter", hint: "I move produce between mandis" },
];

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

/** Supabase error strings are developer-facing; keep the ones users can act on. */
function readableAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many codes requested. Wait a minute and try again.";
  }
  if (lower.includes("invalid") || lower.includes("expired")) {
    return "That code is not valid or has already expired. Request a new one.";
  }
  if (lower.includes("sms") || lower.includes("provider")) {
    return "SMS delivery is not configured on this project yet. Ask the operator to enable a phone provider in Supabase.";
  }
  return message;
}

export function AuthForm({
  initialMode,
  initialRole,
  next,
  phoneAuth,
}: {
  initialMode: Mode;
  initialRole: SignupRole;
  next?: string;
  /** True when Supabase is configured, which makes phone OTP the only method. */
  phoneAuth: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

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

      {phoneAuth ? (
        <PhoneAuthForm key={mode} mode={mode} initialRole={initialRole} next={next} />
      ) : (
        <LocalAuthForm mode={mode} next={next} />
      )}

      <p className="mt-5 text-center text-[11px] text-charcoal-400">
        By continuing you agree that no payments are processed and listings are moderated, not
        certified.
      </p>
    </div>
  );
}

/* ── Supabase: phone number + one-time code ────────────────────────── */

function PhoneAuthForm({
  mode,
  initialRole,
  next,
}: {
  mode: Mode;
  initialRole: SignupRole;
  next?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "code">("details");
  const [role, setRole] = useState<SignupRole>(initialRole);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("hi");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const e164 = `+91${digitsOnly(phone)}`;

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (pending) return;
    setMessage(null);
    setErrors(undefined);

    if (digitsOnly(phone).length !== 10) {
      setMessage("Enter your 10-digit mobile number.");
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setMessage("Enter your full name.");
      return;
    }

    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { shouldCreateUser: true },
    });
    setPending(false);

    if (error) {
      setMessage(readableAuthError(error.message));
      return;
    }
    setStep("code");
    setCooldown(60);
    setCode("");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setMessage(null);

    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setMessage("Enter the 6-digit code from the SMS.");
      return;
    }

    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token, type: "sms" });
    if (error) {
      setPending(false);
      setMessage(readableAuthError(error.message));
      return;
    }

    const result = await completePhoneAuthAction({ mode, name, role, language, next });
    setPending(false);

    if (!result.ok) {
      setErrors(result.errors);
      setMessage(result.message ?? "Could not finish signing in.");
      if (mode === "signin") setStep("details");
      return;
    }

    router.replace(result.destination ?? "/");
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <div className="rounded-[5px] border border-forest/20 bg-forest-50 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-forest-700">
            <MessageSquare className="size-3.5" aria-hidden /> Code sent to {e164.replace("+91", "+91 ")}
          </p>
          <button
            type="button"
            onClick={() => {
              setStep("details");
              setMessage(null);
            }}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-charcoal-500 underline decoration-charcoal/20 underline-offset-2 hover:text-charcoal"
          >
            <ArrowLeft className="size-3" aria-hidden /> Use a different number
          </button>
        </div>

        {message ? (
          <p role="alert" className="rounded-[5px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12.5px] leading-relaxed text-danger">
            {message}
          </p>
        ) : null}

        <Field label="6-digit code" htmlFor="otp" required>
          <Input
            id="otp"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            required
            autoFocus
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={pending} icon={<ArrowRight className="size-4" />}>
          {mode === "signup" ? "Verify and create account" : "Verify and sign in"}
        </Button>

        <div className="text-center">
          {cooldown > 0 ? (
            <p className="text-[11.5px] text-charcoal-400">Resend in {cooldown}s</p>
          ) : (
            <button
              type="button"
              onClick={() => void sendCode()}
              className="text-[11.5px] font-medium text-forest-700 underline decoration-forest/30 underline-offset-2"
            >
              Resend code
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      {message ? (
        <p role="alert" className="rounded-[5px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12.5px] leading-relaxed text-danger">
          {message}
        </p>
      ) : null}

      {mode === "signup" ? (
        <>
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
                    <span className="block text-[13px] font-medium text-charcoal">{option.label}</span>
                    <span className="block text-[11px] text-charcoal-400">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" error={errors?.name?.[0]} required>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Gurpreet Singh"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field label="Preferred language" htmlFor="language" required>
              <Select
                id="language"
                name="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="en">English</option>
              </Select>
            </Field>
          </div>
        </>
      ) : null}

      <Field label="Mobile number" htmlFor="phone" error={errors?.phone?.[0]} required>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-[5px] border border-r-0 border-ivory-300 bg-ivory px-2.5 text-[13px] text-charcoal-500">
            +91
          </span>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="98100 00000"
            className="rounded-l-none"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </div>
      </Field>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-charcoal-400">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-forest-600" aria-hidden />
        We send a 6-digit code by SMS. No password to remember, and your number is never shown
        publicly — buyers only see it after an order exists.
      </p>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={pending}
        icon={mode === "signup" ? <UserRound className="size-4" /> : <ArrowRight className="size-4" />}
      >
        {mode === "signup" ? "Create account" : "Send code"}
      </Button>

      {pending ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1.5 text-[11.5px] text-charcoal-400"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden /> Sending your code…
        </motion.p>
      ) : null}
    </form>
  );
}

/* ── Local development: password sign-in, no Supabase keys ─────────── */

function LocalAuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const [signInState, signIn, signingIn] = useActionState(signInAction, IDLE as ActionState);
  const [signUpState, signUp, signingUp] = useActionState(signUpAction, IDLE as ActionState);

  const state = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signingIn : signingUp;

  return (
    <>
      <p className="mb-4 rounded-[5px] border border-info/20 bg-info-soft px-3 py-2 text-[11.5px] leading-relaxed text-charcoal-500">
        Supabase is not configured in this environment, so the local development provider is
        active. Set <code className="font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to sign in
        with a phone number and one-time code.
      </p>

      {state.message ? (
        <p role="alert" className="mb-4 rounded-[5px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12.5px] leading-relaxed text-danger">
          {state.message}
        </p>
      ) : null}

      {mode === "signin" ? (
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label="Mobile number" htmlFor="local-phone" error={state.errors?.phone?.[0]} required>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-[5px] border border-r-0 border-ivory-300 bg-ivory px-2.5 text-[13px] text-charcoal-500">
                +91
              </span>
              <Input
                id="local-phone"
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
          <Field label="Password" htmlFor="local-password" error={state.errors?.password?.[0]} required>
            <Input
              id="local-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              required
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending} icon={<ArrowRight className="size-4" />}>
            Sign in
          </Button>
        </form>
      ) : (
        <form action={signUp} className="space-y-4">
          <Field label="Full name" htmlFor="local-name" error={state.errors?.name?.[0]} required>
            <Input id="local-name" name="name" autoComplete="name" placeholder="Gurpreet Singh" required />
          </Field>
          <Field label="Mobile number" htmlFor="local-signup-phone" error={state.errors?.phone?.[0]} required>
            <Input
              id="local-signup-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="98100 00000"
              required
            />
          </Field>
          <Field label="I am a…" htmlFor="local-role" required>
            <Select id="local-role" name="role" defaultValue="FARMER">
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Password" htmlFor="local-new-password" hint="8+ characters" error={state.errors?.password?.[0]} required>
            <Input
              id="local-new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending} icon={<UserRound className="size-4" />}>
            Create account
          </Button>
        </form>
      )}
    </>
  );
}
