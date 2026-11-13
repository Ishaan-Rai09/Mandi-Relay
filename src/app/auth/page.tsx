import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, Languages, Mic } from "lucide-react";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Wordmark } from "@/components/layout/wordmark";
import { getSessionUser, homeFor } from "@/lib/auth";
import type { Role } from "@/lib/domain";
import { googleConfigured } from "@/lib/auth/google";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Mandi Relay — voice-first produce listings and direct offers.",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; role?: string; next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));

  const mode = params.mode === "signup" ? "signup" : "signin";
  const roleParam = (params.role ?? "farmer").toUpperCase();
  const role: Exclude<Role, "ADMIN"> =
    roleParam === "BUYER" ? "BUYER" : roleParam === "TRANSPORTER" ? "TRANSPORTER" : "FARMER";

  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : undefined;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[0.92fr_1.08fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-forest-900 p-10 text-ivory lg:flex">
        <div className="paper pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
        <div className="relative">
          <Link href="/" aria-label="Mandi Relay home">
            <Wordmark tone="ivory" />
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold">
            Voice-first marketplace
          </p>
          <h2 className="mt-4 font-display text-[34px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ivory">
            A farmer should not need a course to sell a harvest.
          </h2>
          <blockquote className="mt-7 border-l-2 border-gold/60 pl-4">
            <p className="font-devanagari text-[15px] leading-relaxed text-ivory/85">
              “मेरे पास कल सुबह 500 किलो ताज़े टमाटर हैं। मैं मोहाली में हूँ।”
            </p>
            <footer className="mt-2 text-[11.5px] text-ivory/50">
              Spoken once. Extracted into a listing, with buyers matched nearby.
            </footer>
          </blockquote>

          <ul className="mt-8 space-y-3">
            {[
              { icon: Mic, text: "Speak in Hindi, Punjabi or English — or type if you prefer" },
              { icon: BadgeCheck, text: "Offers persist; nothing is accepted without your confirmation" },
              { icon: Languages, text: "Whole interface available in 22 Indian languages" },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-2.5">
                <item.icon className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <span className="text-[12.5px] leading-relaxed text-ivory/70">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[10.5px] leading-relaxed text-ivory/35">
          Built for Punjab and the NCR corridor. Sign in with Google or an email address. No
          financial transactions are processed.
        </p>
      </aside>

      {/* Form panel */}
      <main id="main" className="flex flex-col bg-ivory">
        <div className="flex items-center justify-between px-5 py-4 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-charcoal-500 transition-colors hover:text-forest-700"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="lg:hidden">
              <Wordmark compact />
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center px-5 pb-12 pt-4 sm:items-center lg:px-10">
          <div className="w-full max-w-[420px]">
            <h1 className="font-display text-[26px] font-bold tracking-[-0.03em] text-charcoal">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-charcoal-500">
              {mode === "signup"
                ? "One account, one workspace. Choose how you use the market."
                : "Sign in to see your produce, offers and orders."}
            </p>

            <div className="mt-6">
              <AuthForm
                initialMode={mode}
                initialRole={role}
                next={next}
                googleEnabled={googleConfigured()}
                oauthError={params.error}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
