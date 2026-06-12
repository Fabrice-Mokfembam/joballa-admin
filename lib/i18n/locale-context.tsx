"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { en, type TranslationDictionary } from "./locales/en";
import { fr } from "./locales/fr";

type TranslationTree = typeof en;

export type Locale = "en" | "fr";

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<TranslationTree>;

const dictionaries: Record<Locale, TranslationDictionary> = { en, fr };

function getSavedLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("joballa-locale");
  return saved === "fr" ? "fr" : "en";
}

function resolveMessage(dictionary: TranslationDictionary, key: string): string {
  const parts = key.split(".");
  let current: unknown = dictionary;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : key;
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getSavedLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("joballa-locale", next);
      document.documentElement.lang = next;
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string>) => {
      let message = resolveMessage(dictionaries[locale], key);
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          message = message.replace(`{${name}}`, value);
        }
      }
      return message;
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useTranslation must be used within LocaleProvider");
  }
  return context;
}

export function getPageTitleKey(pathname: string): TranslationKey {
  if (pathname === "/admin") return "pages.dashboard";
  if (pathname.startsWith("/admin/kyc")) return "pages.kyc";
  if (pathname.startsWith("/admin/documents")) return "pages.documents";
  if (pathname.startsWith("/admin/jobs")) return "pages.pendingJobs";
  if (pathname.startsWith("/admin/rejected-jobs")) return "pages.rejectedJobs";
  if (pathname.startsWith("/admin/verified-jobs")) return "pages.verifiedJobs";
  if (pathname.startsWith("/admin/departments")) return "pages.departments";
  if (pathname.startsWith("/admin/admins")) return "pages.admins";
  if (pathname.startsWith("/admin/permissions")) return "pages.permissions";
  if (pathname.startsWith("/admin/users")) return "pages.users";
  if (pathname.startsWith("/admin/profiles")) return "pages.profiles";
  if (pathname.startsWith("/admin/financial-records")) return "pages.financialRecords";
  if (pathname.startsWith("/admin/disputes") || pathname.startsWith("/admin/reports")) return "pages.reports";
  if (pathname.startsWith("/admin/platform-logs")) return "pages.logs";
  return "pages.default";
}
