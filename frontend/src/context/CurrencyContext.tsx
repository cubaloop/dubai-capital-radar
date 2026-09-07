import React, { createContext, useContext, useState } from 'react';

export type CurrencyCode = 'AED' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rateToUsd: number; // 1 USD = rateToUsd in this currency
  flag: string;
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  AED: {
    code: 'AED',
    symbol: 'AED ',
    label: 'AED (د.إ)',
    rateToUsd: 3.6725,
    flag: '🇦🇪'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD ($)',
    rateToUsd: 1.0,
    flag: '🇺🇸'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'EUR (€)',
    rateToUsd: 0.925,
    flag: '🇪🇺'
  }
};

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (curr: CurrencyCode) => void;
  config: CurrencyConfig;
  formatPrice: (amount: number, fromCurrency?: CurrencyCode) => string;
  convertPrice: (amount: number, fromCurrency?: CurrencyCode, toCurrency?: CurrencyCode) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always default to AED on initial load / incognito
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('dcr_currency');
      if (saved === 'USD' || saved === 'EUR' || saved === 'AED') {
        return saved;
      }
    } catch (_) {}
    return 'AED';
  });

  const setCurrency = (curr: CurrencyCode) => {
    setCurrencyState(curr);
    try {
      localStorage.setItem('dcr_currency', curr);
    } catch (_) {}
  };

  const currentConfig = CURRENCY_CONFIGS[currency];

  /**
   * Convert an amount from one currency to another using fixed pegged rates
   */
  const convertPrice = (
    amount: number,
    fromCurrency: CurrencyCode = 'AED',
    toCurrency: CurrencyCode = currency
  ): number => {
    if (fromCurrency === toCurrency) return amount;
    // 1. Convert from fromCurrency to USD
    const usdAmount = amount / CURRENCY_CONFIGS[fromCurrency].rateToUsd;
    // 2. Convert from USD to target currency
    return usdAmount * CURRENCY_CONFIGS[toCurrency].rateToUsd;
  };

  /**
   * Format an amount into the active currency with appropriate symbol and commas
   */
  const formatPrice = (amount: number, fromCurrency: CurrencyCode = 'AED'): string => {
    const converted = convertPrice(amount, fromCurrency, currency);
    const rounded = Math.round(converted);
    const formattedNumber = rounded.toLocaleString('en-US');

    if (currency === 'AED') {
      return `AED ${formattedNumber}`;
    }
    if (currency === 'EUR') {
      return `€${formattedNumber}`;
    }
    return `$${formattedNumber}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        config: currentConfig,
        formatPrice,
        convertPrice
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
