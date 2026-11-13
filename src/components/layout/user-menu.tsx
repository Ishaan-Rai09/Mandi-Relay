"use client";

import Link from "next/link";
import { LogOut, Settings, ShieldCheck } from "lucide-react";

import { useT } from "@/components/i18n/locale-provider";
import { ROLE_ACCENT } from "@/components/layout/nav-config";
import { signOutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/domain";
import { initials } from "@/lib/utils";

export function UserMenu({ user }: { user: SessionUser }) {
  const t = useT();
  const profileHref =
    user.role === "FARMER"
      ? "/farmer/profile"
      : user.role === "BUYER"
        ? "/buyer/profile"
        : user.role === "TRANSPORTER"
          ? "/transporter/profile"
          : "/admin/dashboard";

  return (
    <details className="group relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-[5px] p-1 pr-2 transition-colors hover:bg-charcoal/[0.04] [&::-webkit-details-marker]:hidden"
        aria-label="Account menu"
      >
        <span className="grid size-8 place-items-center rounded-full bg-forest text-[11.5px] font-semibold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-32 truncate text-[12.5px] font-semibold text-charcoal">
            {user.name}
          </span>
          <span className="block text-[10.5px] text-charcoal-400">{t(ROLE_ACCENT[user.role].labelKey)}</span>
        </span>
        <svg viewBox="0 0 16 16" className="size-3 text-charcoal-400" aria-hidden>
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </summary>

      <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-[6px] border border-ivory-300 bg-white shadow-[var(--shadow-e3)]">
        <div className="border-b border-ivory-200 px-3 py-2.5">
          <p className="truncate text-[13px] font-semibold text-charcoal">{user.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-charcoal-400">
            {user.verified ? (
              <>
                <ShieldCheck className="size-3 text-forest-600" aria-hidden /> Verified account
              </>
            ) : (
              "Verification pending"
            )}
          </p>
        </div>
        <Link
          href={profileHref}
          className="flex items-center gap-2 px-3 py-2 text-[13px] text-charcoal-500 transition-colors hover:bg-ivory hover:text-charcoal"
        >
          <Settings className="size-3.5" aria-hidden /> {t("nav.profileSettings")}
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-charcoal-500 transition-colors hover:bg-ivory hover:text-danger"
          >
            <LogOut className="size-3.5" aria-hidden /> {t("nav.signOut")}
          </button>
        </form>
      </div>
    </details>
  );
}
