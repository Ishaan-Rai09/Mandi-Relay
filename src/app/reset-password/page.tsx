import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-forms";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Wordmark } from "@/components/layout/wordmark";
import { getSessionUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your MANDI RELAY account.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

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
          {token ? (
            <>
              <h1 className="font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal">
                Choose a new password
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-charcoal-500">
                Pick something you have not used before. The link stops working once you save.
              </p>

              <div className="mt-6">
                <ResetPasswordForm token={token} />
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal">
                This link is incomplete
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-charcoal-500">
                The address is missing its reset token, so it cannot be used. Email clients sometimes
                cut long links in half — ask for a fresh one and open it straight from the message.
              </p>
              <Link
                href="/forgot-password"
                className="mt-5 inline-flex items-center rounded-[5px] bg-forest-700 px-4 py-2.5 text-[13.5px] font-medium text-ivory transition-colors hover:bg-forest-800"
              >
                Request a new link
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
