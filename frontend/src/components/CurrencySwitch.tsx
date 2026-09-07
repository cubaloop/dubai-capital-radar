import React from 'react';
import { useCurrency, CurrencyCode, CURRENCY_CONFIGS } from '../context/CurrencyContext';

interface CurrencySwitchProps {
  className?: string;
  variant?: 'compact' | 'segmented';
}

export const CurrencySwitch: React.FC<CurrencySwitchProps> = ({
  className = '',
  variant = 'segmented'
}) => {
  const { currency, setCurrency } = useCurrency();

  const currencies: CurrencyCode[] = ['AED', 'USD', 'EUR'];

  if (variant === 'compact') {
    return (
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        className={`bg-slate-900 border border-slate-700 text-gold-400 text-xs font-mono font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-gold-500 cursor-pointer ${className}`}
      >
        {currencies.map((c) => (
          <option key={c} value={c}>
            {CURRENCY_CONFIGS[c].flag} {CURRENCY_CONFIGS[c].label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-1 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner ${className}`}
      role="group"
      aria-label="Currency Selector"
    >
      {currencies.map((code) => {
        const conf = CURRENCY_CONFIGS[code];
        const isActive = currency === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setCurrency(code)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
              isActive
                ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <span>{conf.flag}</span>
            <span>{code}</span>
          </button>
        );
      })}
    </div>
  );
};
