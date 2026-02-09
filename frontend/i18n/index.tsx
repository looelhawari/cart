import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";

import en from "./locales/en";
import ar from "./locales/ar";

export type Language = "en" | "ar";

type TranslationKeys = typeof en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationKeys;
  isRTL: boolean;
}

const translations = {
  en,
  ar,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "app_language";

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isInitialized, setIsInitialized] = useState(false);

  const updateRTL = useCallback((lang: Language) => {
    const isRTL = lang === "ar";
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // Note: RTL changes require app restart to take full effect
    }
  }, []);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (
          savedLanguage &&
          (savedLanguage === "en" || savedLanguage === "ar")
        ) {
          setLanguageState(savedLanguage);
          updateRTL(savedLanguage);
        }
      } catch (error) {
        console.error("Failed to load saved language:", error);
      } finally {
        setIsInitialized(true);
      }
    };
    loadSavedLanguage();
  }, [updateRTL]);

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);

      // Check if RTL direction needs to change
      const needsRTL = lang === "ar";
      const directionChanged = I18nManager.isRTL !== needsRTL;

      I18nManager.allowRTL(needsRTL);
      I18nManager.forceRTL(needsRTL);

      // Reload app if direction changed — required for RTL/LTR to take effect
      if (directionChanged) {
        try {
          await Updates.reloadAsync();
        } catch {
          // In dev mode, reloadAsync may not work — fallback is manual restart
        }
      }
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  };

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
    isRTL: language === "ar",
  };

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

// Helper hook to get translations
export function useTranslation() {
  const { t, language, isRTL } = useI18n();
  return { t, language, isRTL };
}

// Helper hook for dynamic content (products, categories from DB)
export function useLocalizedValue() {
  const { language } = useI18n();

  // Get localized value from an object with _en and _ar suffixes
  const getLocalizedValue = useCallback(
    <T extends Record<string, any>>(
      item: T | null | undefined,
      field: string,
      fallback: string = "",
    ): string => {
      if (!item) return fallback;

      const arField = `${field}_ar`;
      const enField = `${field}_en`;

      if (language === "ar") {
        // Try Arabic first, then English, then camelCase versions
        return (
          item[arField] ||
          item[`${field}Ar`] ||
          item[enField] ||
          item[`${field}En`] ||
          item[field] ||
          fallback
        );
      }
      // English: Try English first, then Arabic as fallback
      return (
        item[enField] ||
        item[`${field}En`] ||
        item[arField] ||
        item[`${field}Ar`] ||
        item[field] ||
        fallback
      );
    },
    [language],
  );

  // Convenience methods for common fields
  const getName = useCallback(
    <T extends Record<string, any>>(item: T | null | undefined): string => {
      return getLocalizedValue(item, "name", "");
    },
    [getLocalizedValue],
  );

  const getDescription = useCallback(
    <T extends Record<string, any>>(item: T | null | undefined): string => {
      return getLocalizedValue(item, "description", "");
    },
    [getLocalizedValue],
  );

  return {
    language,
    getLocalizedValue,
    getName,
    getDescription,
  };
}

export default {
  I18nProvider,
  useI18n,
  useTranslation,
};
