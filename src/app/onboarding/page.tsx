import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { Wordmark } from "@/components/layout/wordmark";
import { requireUser } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/domain";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");

  const steps = [
    { label: "Account", done: true },
    { label: "Location & details", done: Boolean(user.district) },
    { label: "Workspace", done: false },
  ];

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="border-b border-ivory-300 bg-white/70">
        <div className="container-x flex h-14 items-center justify-between">
          <Link href="/" aria-label="Mandi Relay home">
            <Wordmark compact />
          </Link>
          <Link
            href={ROLE_HOME[user.role]}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-charcoal-500 hover:text-forest-700"
          >
            Skip for now <ArrowLeft className="size-3 rotate-180" aria-hidden />
          </Link>
        </div>
      </header>

      <main id="main" className="container-x max-w-3xl py-8 sm:py-12">
        <ol className="mb-8 flex items-center gap-2">
          {steps.map((step, index) => (
            <li key={step.label} className="flex flex-1 items-center gap-2">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  step.done
                    ? "bg-forest text-white"
                    : index === 1
                      ? "bg-gold text-charcoal"
                      : "border border-ivory-300 bg-white text-charcoal-400"
                }`}
              >
                {step.done ? <CheckCircle2 className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span
                className={`hidden text-[12px] sm:block ${
                  step.done || index === 1 ? "font-medium text-charcoal" : "text-charcoal-400"
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 ? (
                <span className="h-px flex-1 bg-ivory-300" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>

        <p className="eyebrow">{ROLE_LABEL[user.role]} setup</p>
        <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.03em] text-charcoal">
          A few details, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-charcoal-500">
          Nothing here is public beyond your name, district and verification status. Your phone
          number is only shared after a confirmed order.
        </p>

        <div className="mt-7">
          <OnboardingForm role={user.role} defaultName={user.name} defaultPhone={user.phone} />
        </div>
      </main>
    </div>
  );
}
