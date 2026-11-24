"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, LayoutDashboard, LogIn, Mic, ShieldCheck, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  /** Homepage anchor this entry targets, used for the active state. */
  section?: string;
}

const SECTIONS: TabItem[] = [
  { href: "/#how-it-works", labelKey: "nav.howItWorks", icon: Compass, section: "#how-it-works" },
  { href: "/#voice", labelKey: "nav.voiceListing", icon: Mic, section: "#voice" },
  { href: "/marketplace-preview", labelKey: "nav.marketplace", icon: Store },
  { href: "/#trust", labelKey: "nav.trust", icon: ShieldCheck, section: "#trust" },
];

/**
 * Bottom tab bar for the installed (standalone) app on phones. It replaces the
 * header hamburger, which stays for ordinary mobile browser tabs. Visibility is
 * pure CSS (`display-mode: standalone`), so the shell never shifts after
 * hydration and no JavaScript is needed to detect the install.
 */
export function PublicTabBar({
  signedIn,
  homeHref,
}: {
  signedIn: boolean;
  homeHref: string | null;
}) {
  const pathname = usePathname();
  const t = useT();
  const [section, setSection] = useState("");

  // Anchor links do not change `pathname`, so track the hash to highlight the
  // section currently on screen after a tap.
  useEffect(() => {
    const sync = () => setSection(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const tabs: TabItem[] = [
    ...SECTIONS,
    signedIn && homeHref
      ? { href: homeHref, labelKey: "nav.openWorkspace", icon: LayoutDashboard }
      : { href: "/auth", labelKey: "nav.signIn", icon: LogIn },
  ];

  const isActive = (item: TabItem) =>
    item.section
      ? pathname === "/" && section === item.section
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-ivory-300 bg-ivory/95 backdrop-blur-md max-md:standalone:block"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {tabs.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[10.5px] font-medium transition-colors",
                  active ? "text-forest-800" : "text-charcoal-400",
                )}
              >
                <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.8} />
                <span className="w-full truncate text-center">{t(item.labelKey)}</span>
                {active ? (
                  <span aria-hidden className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-gold" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
