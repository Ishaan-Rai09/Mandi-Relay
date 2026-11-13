import { LOCALES } from "@/lib/i18n/locales";

/**
 * The `<option>` list for every "Preferred language" select.
 *
 * One source (the locale registry) so sign-up, onboarding and the profile page
 * always offer the same 22 languages, each in its own script — a speaker should
 * not have to find their language by reading an English name for it.
 */
export function LanguageOptions() {
  return (
    <>
      {LOCALES.map((locale) => (
        <option key={locale.code} value={locale.code}>
          {locale.native} ({locale.label})
        </option>
      ))}
    </>
  );
}
