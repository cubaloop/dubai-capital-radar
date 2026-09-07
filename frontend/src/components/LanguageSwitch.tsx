import React from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageSwitchProps {
  className?: string;
  variant?: 'pill' | 'compact' | 'light';
}

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ className = '', variant = 'pill' }) => {
  const { language, setLanguage } = useTranslation();

  if (variant === 'compact') {
    return (
      <button
        onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all active:scale-95 ${
          language === 'en'
            ? 'bg-slate-900 border-slate-700 text-gold-400'
            : 'bg-amber-950/80 border-gold-500 text-amber-300'
        } ${className}`}
        title={language === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{language === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}</span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}
      role="group"
      aria-label="Language Selector"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
          language === 'en'
            ? 'bg-gold-500 text-slate-950 shadow-sm shadow-gold-500/30'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        title="Switch to English (Default)"
      >
        <span>🇺🇸</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('es')}
        className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
          language === 'es'
            ? 'bg-gold-500 text-slate-950 shadow-sm shadow-gold-500/30'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
        title="Cambiar a Español"
      >
        <span>🇪🇸</span>
        <span>ES</span>
      </button>
    </div>
  );
};
