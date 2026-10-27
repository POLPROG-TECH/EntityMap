import { EN } from "../locales/en.js";
import { PL } from "../locales/pl.js";

export const LOCALES = { en: EN, pl: PL };
export const FALLBACK_LANGUAGE = "en";

/**
 * The Home Assistant user language comes first (it already defaults to the
 * browser language); when it is missing or not bundled, the browser's own
 * preferred languages are tried before English.
 */
export function resolveLanguage(hass, browserLanguages = globalThis.navigator?.languages ?? []) {
  const requested = [hass?.locale?.language, hass?.language, ...browserLanguages];
  const supported = requested.filter(Boolean).map(baseLanguage).find((language) => language in LOCALES);

  return supported ?? FALLBACK_LANGUAGE;
}

function baseLanguage(tag) {
  return String(tag).toLowerCase().split("-")[0];
}

/**
 * A message is either a string or a map of Intl plural categories, picked by
 * the `count` variable. Placeholders use `{name}`; unknown ones stay visible
 * so a missing variable is easy to spot.
 */
export function translate(language, key, vars = {}) {
  const message = lookup(language, key) ?? lookup(FALLBACK_LANGUAGE, key) ?? key;
  const template = typeof message === "object" ? pluralForm(language, message, vars.count) : message;

  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

function lookup(language, key) {
  return LOCALES[language]?.[key];
}

function pluralForm(language, forms, count) {
  const category = new Intl.PluralRules(language).select(Number(count) || 0);

  return forms[category] ?? forms.other;
}
