"use client";

import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { signInAction, signUpAction } from "@/lib/actions/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { IDLE } from "@/lib/schemas";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const ROLE_OPTIONS: { value: Exclude<Role, "ADMIN">; label: string; hint: string }[] = [
  { value: "FARMER", label: "Farmer / producer", hint: "I sell what I grow" },
  { value: "BUYER", label: "Buyer / business", hint: "I buy for retail, kitchen or trade" },
  { value: "TRANSPORTER", label: "Transporter", hint: "I move produce between mandis" },
];

export function AuthForm({
  initialMode,
  initialRole,
  next,
}: {
  initialMode: Mode;
  initialRole: Exclude<Role, "ADMIN">;
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Exclude<Role, "ADMIN">>(initialRole);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [signInState, signIn, signingIn] = useActionState(signInAction, IDLE);
  const [signUpState, signUp, signingUp] = useActionState(signUpAction, IDLE);

  const state = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signingIn : signingUp;

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
          <Field label="Mobile number" htmlFor="phone" error={state.errors?.phone?.[0]} required>
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
                placeholder="98100 00001"
                className="rounded-l-none"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="password" error={state.errors?.password?.[0]} required>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-charcoal-400 hover:text-charcoal"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={pending} icon={<ArrowRight className="size-4" />}>
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
                    <span className="block text-[13px] font-medium text-charcoal">{option.label}</span>
                    <span className="block text-[11px] text-charcoal-400">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" error={state.errors?.name?.[0]} required>
              <Input id="name" name="name" autoComplete="name" placeholder="Gurpreet Singh" required />
            </Field>
            <Field label="Mobile number" htmlFor="signup-phone" error={state.errors?.phone?.[0]} required>
              <Input
                id="signup-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98100 00001"
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
                placeholder="Choose a password"
                minLength={8}
                required
              />
            </Field>
            <Field label="Preferred language" htmlFor="language" required>
              <Select id="language" name="language" defaultValue="hi">
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="en">English</option>
              </Select>
            </Field>
          </div>

          <p className="text-[11px] leading-relaxed text-charcoal-400">
            Next you will add your district and business details. Your phone number is never shown
            publicly — buyers only see it after an order exists.
          </p>

          <Button type="submit" size="lg" className="w-full" loading={pending} icon={<UserRound className="size-4" />}>
            Create account
          </Button>
        </form>
      )}

      <div className="mt-6 rounded-[6px] border border-ivory-300 bg-ivory/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sage">
            <ShieldCheck className="size-3.5 text-forest-600" aria-hidden />
            Demonstration accounts
          </p>
          <span className="text-[10.5px] text-charcoal-400">password: {DEMO_PASSWORD}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.filter((account) => account.role !== "ADMIN").map((account) => (
            <button
              key={account.phone}
              type="button"
              onClick={() => {
                setMode("signin");
                setPhone(account.phone);
                setPassword(DEMO_PASSWORD);
              }}
              className="rounded-full border border-ivory-300 bg-white px-2.5 py-1 text-[11px] text-charcoal-500 transition-colors hover:border-forest/30 hover:text-forest-700"
              title={`${account.name} — ${account.detail}`}
            >
              {account.label}
            </button>
          ))}
          {DEMO_ACCOUNTS.filter((account) => account.role === "ADMIN").map((account) => (
            <button
              key={account.phone}
              type="button"
              onClick={() => {
                setMode("signin");
                setPhone(account.phone);
                setPassword(DEMO_PASSWORD);
              }}
              className="rounded-full border border-violet-300/40 bg-white px-2.5 py-1 text-[11px] text-charcoal-500 transition-colors hover:border-forest/30 hover:text-forest-700"
            >
              {account.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-charcoal-400">
          One tap fills the credentials. All seeded listings, offers and bids are marked as
          demonstration data in the app.
        </p>
      </div>

      {pending ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-charcoal-400"
        >
          <Loader2 className="size-3 animate-spin" aria-hidden /> Signing you in…
        </motion.p>
      ) : null}

      <p className="mt-5 text-center text-[11px] text-charcoal-400">
        By continuing you agree that this is a prototype: no payments are processed and listings
        are moderated, not certified.
        {ROLE_LABEL.ADMIN ? null : null}
      </p>
    </div>
  );
}
