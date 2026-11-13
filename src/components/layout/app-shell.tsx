import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, CircleAlert } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MobileNav, SidebarNav } from "@/components/layout/app-nav";
import { ROLE_ACCENT } from "@/components/layout/nav-config";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UserMenu } from "@/components/layout/user-menu";
import { Wordmark } from "@/components/layout/wordmark";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/domain";
import { getI18n } from "@/lib/i18n";

async function loadCounts(user: SessionUser) {
  const [offers, bids, deliveries] = await Promise.all([
    user.role === "FARMER"
      ? db.offer.count({
          where: {
            status: { in: ["PENDING", "COUNTERED"] },
            actorRole: "BUYER",
            listing: { farmerId: user.id },
          },
        })
      : Promise.resolve(0),
    user.role === "BUYER"
      ? db.offer.count({
          where: { buyerId: user.id, status: { in: ["PENDING", "COUNTERED"] }, actorRole: "FARMER" },
        })
      : Promise.resolve(0),
    user.role === "TRANSPORTER"
      ? db.deliveryRequest.count({ where: { status: { in: ["REQUESTED", "QUOTED"] } } })
      : Promise.resolve(0),
  ]);
  return { offers, bids, deliveries };
}

/**
 * Authenticated workspace shell. Role-scoped navigation, a persistent
 * verification prompt for incomplete profiles and a mobile tab bar.
 */
export async function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const [counts, unread] = await Promise.all([
    loadCounts(user),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const profileIncomplete = !user.district || !user.village;
  const { t } = await getI18n();

  return (
    <div className="min-h-dvh bg-ivory">
      <div className="mx-auto flex w-full max-w-[100rem]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-ivory-300 bg-white/70 lg:flex">
          <div className="flex h-14 items-center px-4">
            <Link href="/" aria-label="Mandi Relay home">
              <Wordmark />
            </Link>
          </div>
          <div className="mx-4 rounded-[5px] border border-ivory-200 bg-ivory px-2.5 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sage">
              {t(ROLE_ACCENT[user.role].labelKey)}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav role={user.role} counts={counts} />
          </div>
          <div className="border-t border-ivory-200 p-3">
            <Link
              href="/notifications"
              className="flex items-center justify-between rounded-[5px] px-2.5 py-2 text-[12.5px] font-medium text-charcoal-500 transition-colors hover:bg-charcoal/[0.04] hover:text-charcoal"
            >
              <span className="flex items-center gap-2">
                <Bell className="size-3.5" aria-hidden /> {t("nav.notifications")}
              </span>
              {unread > 0 ? (
                <span className="rounded-full bg-gold px-1.5 text-[10.5px] font-semibold leading-[18px] text-charcoal tabular">
                  {unread}
                </span>
              ) : null}
            </Link>
            <p className="mt-1 px-2.5 text-[10.5px] leading-relaxed text-charcoal-400">
              {t("shell.voicePermission")}
            </p>
            <div className="mt-2 px-1">
              <LanguageSwitcher className="w-full justify-between" />
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-ivory-300 bg-ivory/90 backdrop-blur-md">
            <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
              <div className="flex items-center gap-3 lg:hidden">
                <Link href="/" aria-label="Mandi Relay home">
                  <Wordmark compact />
                </Link>
                <span className="rounded-[3px] border border-ivory-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sage">
                  {t(ROLE_ACCENT[user.role].labelKey)}
                </span>
              </div>

              <div className="hidden items-center gap-2 text-[12px] text-charcoal-400 lg:flex">
                <span className="size-1.5 rounded-full bg-success" aria-hidden />
                Connected workspace · prices shown as reference, not quotes
              </div>

              <div className="flex items-center gap-1.5">
                <LanguageSwitcher className="hidden sm:inline-flex" />
                <Link
                  href="/notifications"
                  className="relative grid size-9 place-items-center rounded-[5px] text-charcoal-500 transition-colors hover:bg-charcoal/[0.05] hover:text-charcoal"
                  aria-label={unread > 0 ? `${t("nav.notifications")}, ${unread}` : t("nav.notifications")}
                >
                  <Bell className="size-[17px]" strokeWidth={1.9} />
                  {unread > 0 ? (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gold ring-2 ring-ivory" />
                  ) : null}
                </Link>
                <UserMenu user={user} />
              </div>
            </div>
          </header>

          <main id="main" className="flex-1 px-3 pb-24 pt-4 sm:px-5 sm:pt-6 lg:pb-10">
            {profileIncomplete ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-gold/40 bg-gold-50 px-3.5 py-2.5">
                <p className="flex items-center gap-2 text-[12.5px] text-charcoal-500">
                  <CircleAlert className="size-4 shrink-0 text-gold-700" aria-hidden />
                  Finish your location details so nearby buyers and distance filters work.
                </p>
                <Link
                  href="/onboarding"
                  className="text-[12.5px] font-semibold text-forest-700 underline decoration-forest/30 underline-offset-2 hover:decoration-forest"
                >
                  {t("shell.completeProfile")}
                </Link>
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>

      <MobileNav role={user.role} counts={counts} />
      <InstallPrompt />
    </div>
  );
}
