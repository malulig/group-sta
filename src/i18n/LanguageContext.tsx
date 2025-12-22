import React, { createContext, useContext, useMemo, useState } from "react";
import * as Localization from "expo-localization";
import { Lang, SUPPORTED_LANGS } from "./strings";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLang(): Lang {
  const locales = Localization.getLocales();
  const primary = locales[0]?.languageCode?.toLowerCase();
  if (!primary) return "en";
  return SUPPORTED_LANGS.includes(primary as Lang) ? (primary as Lang) : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
