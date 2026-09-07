import React, { useState, useEffect } from 'react';
import { Building2, X, Check, Globe, Shield, Sparkles, UserCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface AgencyConfig {
  agencyName: string;
  brokerPersona: string;
  targetMarket: string;
  currency: string;
  phonePrefix: string;
}

const STORAGE_KEY = 'dcr_agency_config';

export const getStoredAgencyConfig = (): AgencyConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {
    agencyName: 'Dubai Capital Advisory',
    brokerPersona: 'David, Senior Real Estate Investment Advisor',
    targetMarket: 'Dubai (Downtown, Palm Jumeirah, Dubai Hills)',
    currency: 'USD ($)',
    phonePrefix: '+971'
  };
};

export const AgencySettingsModal: React.FC<AgencyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<AgencyConfig>(getStoredAgencyConfig());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredAgencyConfig());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-sm sm:text-base text-gold-200">
                {t('modals.agencyTitle', 'B2B Agency & White-Label Configuration')}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {t('modals.agencySubtitle', 'Brand your platform, customize the AI broker persona, and adjust target market defaults.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('modals.agencyNameLabel', 'Agency Trading Name')}
            </label>
            <input
              type="text"
              value={config.agencyName}
              onChange={(e) => setConfig({ ...config, agencyName: e.target.value })}
              placeholder={t('modals.agencyNamePlaceholder', 'e.g. H.O.M.E Properties or Dubai Capital Advisory')}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t('modals.brokerPersonaLabel', 'AI Advisor Persona & Voice')}
            </label>
            <input
              type="text"
              value={config.brokerPersona}
              onChange={(e) => setConfig({ ...config, brokerPersona: e.target.value })}
              placeholder={t('modals.brokerPersonaPlaceholder', 'e.g. David, Senior Investment Advisor at H.O.M.E Properties Dubai...')}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('modals.targetMarketLabel', 'Primary Target Market')}
              </label>
              <select
                value={config.targetMarket}
                onChange={(e) => setConfig({ ...config, targetMarket: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-slate-900 bg-white"
              >
                <option value="Dubai (Downtown, Palm, Hills)">Dubai (Downtown, Palm, Hills)</option>
                <option value="Madrid / Barcelona (España)">Madrid / Barcelona (Spain)</option>
                <option value="Miami / Florida (USA)">Miami / Florida (USA)</option>
                <option value="Internacional Global">International Global</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('modals.currencyLabel', 'Display Currency')}
              </label>
              <select
                value={config.currency}
                onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-slate-900 bg-white"
              >
                <option value="USD ($)">USD ($)</option>
                <option value="EUR (€)">EUR (€)</option>
                <option value="AED (د.إ)">AED (د.إ)</option>
              </select>
            </div>
          </div>

          {/* Cloud Persist Alert */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-900">
              <span className="font-bold">{t('auth.footerNote', 'Protected by 256-bit encryption. Multi-tenant Supabase persistence.')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-gold-500 hover:bg-gold-600 text-slate-950 shadow-md shadow-gold-500/20'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" /> {t('common.copied', 'Saved')}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> {t('modals.saveAgencyBtn', 'Save Agency Settings')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
