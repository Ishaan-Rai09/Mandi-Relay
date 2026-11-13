import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/reset-forms";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Wordmark } from "@/components/layout/wordmark";
import { getSessionUser, homeFor } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a single-use link to set a new password for your MANDI RELAY account.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="flex items-center justify-between px-5 py-4 lg:px-10">
        <Link href="/" aria-label="Mandi Relay home">
          <Wordmark />
        </Link>
        <LanguageSwitcher />
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center">
        <div className="w-full max-w-[420px]">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal">
            Forgot your password?
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-charcoal-500">
            Enter the email address on your account and we will send a link to set a new password.
          </p>

          {!emailConfigured() ? (
            <p className="mt-4 rounded-[5px] border border-gold/40 bg-ivory-200/70 px-3 py-2 text-[12px] leading-relaxed text-charcoal-600">
              Email delivery is not configured on this deployment yet. Your reset link will appear on
              this page instead of arriving in your inbox.
            </p>
          ) : null}

          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
