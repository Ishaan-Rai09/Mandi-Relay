"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/components/i18n/locale-provider";
import { NAV } from "@/components/layout/nav-config";
import type { Role } from "@/lib/domain";
import { cn } from "@/lib/utils";

const BADGE_MEANING: Record<string, string> = {
  offers: "Offers awaiting your response",
  bids: "Offer activity",
  deliveries: "Open delivery requests",
};

interface NavCounts {
  offers?: number;
  bids?: number;
  deliveries?: number;
}

export function SidebarNav({
  role,
  counts,
}: {
  role: Role;
  counts: NavCounts;
}) {
  const pathname = usePathname();
  const t = useT();
  const { primary, secondary } = NAV[role];

  const renderItem = (item: (typeof primary)[number]) => {
    const active =
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ||
      (item.href.endsWith("/dashboard") && pathname === item.href);
    const count = item.badge ? counts[item.badge] ?? 0 : 0;
    const Icon = item.icon;

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group relative flex items-center gap-2.5 rounded-[5px] px-2.5 py-[7px] text-[13.5px] transition-colors",
            active
              ? "bg-forest-50 font-semibold text-forest-800"
              : "font-medium text-charcoal-500 hover:bg-charcoal/[0.04] hover:text-charcoal",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-gold transition-opacity",
              active ? "opacity-100" : "opacity-0",
            )}
          />
          <Icon
            className={cn(
              "size-[15px] shrink-0",
              active ? "text-forest-700" : "text-charcoal-400 group-hover:text-charcoal-500",
              item.emphasis && !active && "text-forest-600",
            )}
            strokeWidth={1.9}
          />
          <span className="truncate">{t(item.labelKey)}</span>
          {count > 0 ? (
            <span
              title={BADGE_MEANING[item.badge!]}
              className={cn(
                "ml-auto min-w-5 rounded-full px-1.5 text-center text-[10.5px] font-semibold leading-[18px] tabular",
                item.badge === "offers"
                  ? "bg-gold text-charcoal"
                  : "bg-forest-100 text-forest-700",
              )}
            >
              {count}
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label={`${role.toLowerCase()} navigation`} className="px-2.5 py-3">
      <ul className="space-y-0.5">{primary.map(renderItem)}</ul>
      {secondary.length > 0 ? (
        <>
          <div className="mx-2.5 my-3 border-t border-ivory-200" />
          <ul className="space-y-0.5">{secondary.map(renderItem)}</ul>
        </>
      ) : null}
    </nav>
  );
}

export function MobileNav({ role, counts }: { role: Role; counts: NavCounts }) {
  const pathname = usePathname();
  const t = useT();
  const items = NAV[role].primary.slice(0, 5);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ivory-300 bg-ivory/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = item.badge ? counts[item.badge] ?? 0 : 0;
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
                <span className="relative">
                  <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.8} />
                  {count > 0 ? (
                    <span className="absolute -right-1.5 -top-1 grid size-3.5 place-items-center rounded-full bg-gold text-[8.5px] font-bold text-charcoal">
                      {count > 9 ? "9+" : count}
                    </span>
                  ) : null}
                </span>
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
