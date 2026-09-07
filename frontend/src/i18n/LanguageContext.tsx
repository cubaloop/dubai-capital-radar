import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('dcr_lang');
      if (saved === 'es' || saved === 'en') {
        return saved;
      }
    } catch {
      // Fallback
    }
    // Default to English as explicitly requested by user
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('dcr_lang', lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  const t = (path: string, defaultValue?: string): string => {
    const keys = path.split('.');
    
    // Try selected language
    let current: any = translations[language];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === 'string') return current;

    // Fallback to English
    if (language !== 'en') {
      let fallbackCurrent: any = translations.en;
      for (const key of keys) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && key in fallbackCurrent) {
          fallbackCurrent = fallbackCurrent[key];
        } else {
          fallbackCurrent = undefined;
          break;
        }
      }
      if (typeof fallbackCurrent === 'string') return fallbackCurrent;
    }

    return defaultValue !== undefined ? defaultValue : path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

export const useLanguage = useTranslation;
