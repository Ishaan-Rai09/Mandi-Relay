"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Languages } from "lucide-react";

import { useLocale } from "@/components/i18n/locale-provider";
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
} from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Language picker.
 *
 * The choice is written to a cookie the server reads on the next render, so the
 * whole interface — marketing pages, workspace and auth — changes language
 * together. Labels are always shown in their own script, which is what a
 * speaker actually scans for.
 */
export function LanguageSwitcher({
  tone = "light",
  className,
  showLabel = false,
}: {
  tone?: "light" | "dark";
  className?: string;
  showLabel?: boolean;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(locale);

  const change = (next: string) => {
    if (!isLocale(next)) return;
    setValue(next);
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-1 text-[12px] transition-colors",
        tone === "dark"
          ? "border-ivory/20 text-ivory/70 hover:border-ivory/40"
          : "border-ivory-300 bg-white/70 text-charcoal-500 hover:border-charcoal/20",
        pending && "opacity-60",
        className,
      )}
    >
      <Languages className="size-3.5 shrink-0" aria-hidden />
      {showLabel ? <span className="font-medium">{t("nav.language")}</span> : null}
      <select
        value={value}
        onChange={(event) => change(event.target.value)}
        aria-label={t("nav.language")}
        className={cn(
          "cursor-pointer appearance-none bg-transparent pr-1 text-[12px] font-medium outline-none",
          tone === "dark" ? "text-ivory" : "text-charcoal",
        )}
      >
        {LOCALES.map((item) => (
          <option key={item.code} value={item.code} lang={item.bcp47} className="text-charcoal">
            {item.native}
          </option>
        ))}
      </select>
    </label>
  );
}
