import { createContext, useContext, useMemo, type ReactNode } from "react";
import { en } from "./locales/en";
import { fr } from "./locales/fr";

export type Language = "fr" | "en";
export type TranslationKey = keyof typeof fr;

const translations = { fr, en };
const localeByLanguage: Record<Language, string> = {
  fr: "fr-FR",
  en: "en-US",
};

type TranslationParams = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatCurrency: (value: number) => string;
  formatCurrencyPrecise: (value: number) => string;
  formatPercent: (value: number) => string;
  formatMonth: (monthIndex: number, width?: "long" | "short") => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const interpolate = (text: string, params?: TranslationParams) => {
  if (!params) return text;
  return Object.entries(params).reduce((next, [key, value]) => next.replaceAll(`{${key}}`, String(value)), text);
};

export function I18nProvider({
  children,
  language,
  setLanguage,
}: {
  children: ReactNode;
  language: Language;
  setLanguage: (language: Language) => void;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const locale = localeByLanguage[language];
    const currency = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });
    const currencyPrecise = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const percent = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    return {
      language,
      setLanguage,
      t: (key, params) => interpolate(translations[language][key] ?? fr[key], params),
      formatCurrency: (amount) => currency.format(amount),
      formatCurrencyPrecise: (amount) => currencyPrecise.format(amount),
      formatPercent: (amount) => percent.format(amount),
      formatMonth: (monthIndex, width = "long") =>
        new Intl.DateTimeFormat(locale, { month: width }).format(new Date(2024, monthIndex, 1)),
    };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
};
