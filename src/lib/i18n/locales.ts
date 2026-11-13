/**
 * Locale registry.
 *
 * English plus the 22 languages of the Eighth Schedule of the Indian
 * Constitution. Each entry carries the native name (that is what the switcher
 * shows, so a speaker recognises their own language without reading English),
 * the BCP-47 tag used for `<html lang>` and the Web Speech API, and the script
 * direction — Urdu, Sindhi and Kashmiri are written right to left.
 */

export interface LocaleMeta {
  code: string;
  /** Name in English, used for aria labels and the settings list. */
  label: string;
  /** Endonym — shown in the picker. */
  native: string;
  bcp47: string;
  dir: "ltr" | "rtl";
}

export const LOCALES = [
  { code: "en", label: "English", native: "English", bcp47: "en-IN", dir: "ltr" },
  { code: "as", label: "Assamese", native: "অসমীয়া", bcp47: "as-IN", dir: "ltr" },
  { code: "bn", label: "Bengali", native: "বাংলা", bcp47: "bn-IN", dir: "ltr" },
  { code: "brx", label: "Bodo", native: "बड़ो", bcp47: "brx-IN", dir: "ltr" },
  { code: "doi", label: "Dogri", native: "डोगरी", bcp47: "doi-IN", dir: "ltr" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", bcp47: "gu-IN", dir: "ltr" },
  { code: "hi", label: "Hindi", native: "हिन्दी", bcp47: "hi-IN", dir: "ltr" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", bcp47: "kn-IN", dir: "ltr" },
  { code: "ks", label: "Kashmiri", native: "کٲشُر", bcp47: "ks-IN", dir: "rtl" },
  { code: "kok", label: "Konkani", native: "कोंकणी", bcp47: "kok-IN", dir: "ltr" },
  { code: "mai", label: "Maithili", native: "मैथिली", bcp47: "mai-IN", dir: "ltr" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", bcp47: "ml-IN", dir: "ltr" },
  { code: "mni", label: "Manipuri", native: "ꯃꯤꯇꯩ ꯂꯣꯟ", bcp47: "mni-IN", dir: "ltr" },
  { code: "mr", label: "Marathi", native: "मराठी", bcp47: "mr-IN", dir: "ltr" },
  { code: "ne", label: "Nepali", native: "नेपाली", bcp47: "ne-IN", dir: "ltr" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ", bcp47: "or-IN", dir: "ltr" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", bcp47: "pa-IN", dir: "ltr" },
  { code: "sa", label: "Sanskrit", native: "संस्कृतम्", bcp47: "sa-IN", dir: "ltr" },
  { code: "sat", label: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ", bcp47: "sat-IN", dir: "ltr" },
  { code: "sd", label: "Sindhi", native: "سنڌي", bcp47: "sd-IN", dir: "rtl" },
  { code: "ta", label: "Tamil", native: "தமிழ்", bcp47: "ta-IN", dir: "ltr" },
  { code: "te", label: "Telugu", native: "తెలుగు", bcp47: "te-IN", dir: "ltr" },
  { code: "ur", label: "Urdu", native: "اردو", bcp47: "ur-IN", dir: "rtl" },
] as const satisfies readonly LocaleMeta[];

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

/** Cookie holding the visitor's choice; readable by the client so it can switch. */
export const LOCALE_COOKIE = "mr_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const BY_CODE = new Map<string, LocaleMeta>(LOCALES.map((locale) => [locale.code, locale]));

export function isLocale(value: string | undefined | null): value is LocaleCode {
  return Boolean(value && BY_CODE.has(value));
}

export function localeMeta(code: LocaleCode): LocaleMeta {
  return BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_LOCALE)!;
}

/**
 * Resolve a language tag ("hi", "hi-IN", "pa_Guru") to one of ours. Used for the
 * browser's Accept-Language header and for the user's stored profile value.
 */
export function matchLocale(tag: string | null | undefined): LocaleCode | null {
  if (!tag) return null;
  const base = tag.trim().toLowerCase().replace("_", "-").split("-")[0];
  return isLocale(base) ? base : null;
}

/** BCP-47 tag for speech recognition and `<html lang>`. */
export function speechTag(code: LocaleCode): string {
  return localeMeta(code).bcp47;
}
