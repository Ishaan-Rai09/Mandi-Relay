"use client";

import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestResetAction, resetPasswordAction } from "@/lib/actions/auth";
import { IDLE, type ActionState } from "@/lib/schemas";

const SUCCESS = "rounded-[5px] border border-forest/25 bg-forest-50 px-3 py-2 text-[12.5px] leading-relaxed text-forest-700";
const FAILURE = "rounded-[5px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12.5px] leading-relaxed text-danger";

/** Step one: ask for the address, send the link. */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestResetAction, IDLE as ActionState);
  const devLink = typeof state.data?.devLink === "string" ? state.data.devLink : null;

  return (
    <form action={action} className="space-y-4">
      {state.message ? (
        <p role="status" className={state.ok ? SUCCESS : FAILURE}>
          {state.message}
        </p>
      ) : null}

      {devLink ? (
        <p className="rounded-[5px] border border-dashed border-gold/60 bg-ivory-200/60 px-3 py-2 text-[12.5px] leading-relaxed text-charcoal-600">
          Development only —{" "}
          <Link href={devLink} className="font-medium text-forest-700 underline underline-offset-2">
            open the reset page
          </Link>
          .
        </p>
      ) : null}

      <Field label="Email address" htmlFor="forgot-email" error={state.errors?.email?.[0]} required>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          autoFocus
        />
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={pending}
        icon={<ArrowRight className="size-4" />}
      >
        Email me a reset link
      </Button>

      <p className="text-center text-[12px] text-charcoal-400">
        <Link href="/auth" className="font-medium text-forest-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

/** Step two: the token from the link, and the new password twice. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, IDLE as ActionState);
  const expired = state.data?.expired === true;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <p role="alert" className={FAILURE}>
          {state.message}
        </p>
      ) : null}

      {expired ? (
        <p className="text-center text-[12.5px]">
          <Link href="/forgot-password" className="font-medium text-forest-700 hover:underline">
            Request a new reset link
          </Link>
        </p>
      ) : null}

      <Field
        label="New password"
        htmlFor="new-password"
        hint="8+ characters"
        error={state.errors?.password?.[0]}
        required
      >
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          autoFocus
        />
      </Field>

      <Field
        label="Repeat new password"
        htmlFor="confirm-password"
        error={state.errors?.confirmPassword?.[0]}
        required
      >
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
        />
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={pending}
        icon={<KeyRound className="size-4" />}
      >
        Set new password
      </Button>

      <p className="text-[11.5px] leading-relaxed text-charcoal-400">
        Setting a new password signs you out of every other device.
      </p>
    </form>
  );
}
