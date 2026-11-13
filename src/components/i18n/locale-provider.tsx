"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { localeMeta, type LocaleCode } from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/messages";

type Messages = Record<MessageKey, string>;

interface LocaleContextValue {
  locale: LocaleCode;
  dir: "ltr" | "rtl";
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Makes the visitor's language available to client components. The server has
 * already merged English with the chosen locale's translations, so `t` is a
 * plain lookup with no network request.
 */
export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: LocaleCode;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(() => {
    const t: LocaleContextValue["t"] = (key, vars) => {
      const template = messages[key] ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      );
    };
    return { locale, dir: localeMeta(locale).dir, t };
  }, [locale, messages]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return context;
}

/** Shorthand: `const t = useT();` */
export function useT() {
  return useLocale().t;
}
