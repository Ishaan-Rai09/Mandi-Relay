import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeMeta,
  matchLocale,
  type LocaleCode,
} from "./locales";
import { EN, TRANSLATIONS, type MessageKey } from "./messages";

export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  localeMeta,
  matchLocale,
  speechTag,
  type LocaleCode,
  type LocaleMeta,
} from "./locales";
export { EN, TRANSLATIONS, type MessageKey } from "./messages";

export type Messages = Record<MessageKey, string>;

/** English with the chosen locale layered on top; missing keys stay English. */
export function messagesFor(locale: LocaleCode): Messages {
  const merged = { ...EN } as Record<MessageKey, string>;
  if (locale === "en") return merged;

  // Only non-empty strings override the English source, so a half-finished
  // translation still shows a readable label rather than a blank.
  for (const [key, value] of Object.entries(TRANSLATIONS[locale] ?? {})) {
    if (typeof value === "string" && value.trim()) merged[key as MessageKey] = value;
  }
  return merged;
}

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translator(locale: LocaleCode): Translate {
  const messages = messagesFor(locale);
  return (key, vars) => {
    const template = messages[key] ?? EN[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}

/**
 * The visitor's language, from the cookie written by the switcher. Falls back to
 * their browser's Accept-Language, then to English.
 */
export async function getLocale(): Promise<LocaleCode> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const header = (await headers()).get("accept-language");
  if (header) {
    for (const part of header.split(",")) {
      const matched = matchLocale(part.split(";")[0]);
      if (matched) return matched;
    }
  }
  return DEFAULT_LOCALE;
}

/** Convenience for server components: `const { t, locale } = await getI18n();` */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: translator(locale), meta: localeMeta(locale) };
}
