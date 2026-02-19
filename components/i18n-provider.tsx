"use client";

import { type ReactNode, useEffect } from "react";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n/client";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@/lib/i18n/resources";

type I18nProviderProps = {
  children: ReactNode;
};

function isSupportedLanguage(value: string | null): value is AppLanguage {
  if (!value) return false;
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

function getInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isSupportedLanguage(savedLanguage)) {
    return savedLanguage;
  }

  const browserLanguage = navigator.language.slice(0, 2).toLowerCase();
  if (isSupportedLanguage(browserLanguage)) {
    return browserLanguage;
  }

  return DEFAULT_LANGUAGE;
}

export function AppI18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    void i18n.changeLanguage(getInitialLanguage());
  }, []);

  useEffect(() => {
    const updateLanguageState = (language?: string) => {
      const currentLanguage =
        language === "es" || language === "en" ? language : DEFAULT_LANGUAGE;

      document.documentElement.lang = currentLanguage;
      localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    };

    updateLanguageState(i18n.resolvedLanguage);
    i18n.on("languageChanged", updateLanguageState);

    return () => {
      i18n.off("languageChanged", updateLanguageState);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
