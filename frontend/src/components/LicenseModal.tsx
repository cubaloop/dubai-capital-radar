import React, { useState, useEffect } from 'react';
import { Key, ShieldAlert, CheckCircle2, Clock, Zap, ArrowRight, Lock, HelpCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface TrialState {
  registeredAt: number; // timestamp ms
  trialDays: number; // 30
  plan: 'trial_250' | 'plan_600' | 'plan_1500';
  leadLimit: number;
  isUnlocked: boolean;
  activationKey?: string;
}

const TRIAL_STORAGE_KEY = 'dcr_agency_license';

export const getLicenseState = (userEmail?: string): TrialState => {
  // Master admin bypass
  if (userEmail && (userEmail.includes('admin') || userEmail.includes('yo@'))) {
    return {
      registeredAt: Date.now(),
      trialDays: 30,
      plan: 'plan_1500',
      leadLimit: 999999,
      isUnlocked: true,
      activationKey: 'MASTER-DUBAI-2026'
    };
  }

  try {
    const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // fallback
  }

  // Default: New agency gets 30 days trial with 250 leads limit
  const fresh: TrialState = {
    registeredAt: Date.now(),
    trialDays: 30,
    plan: 'trial_250',
    leadLimit: 250,
    isUnlocked: false
  };
  localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
};

export const getRemainingTrialDays = (license: TrialState): number => {
  if (license.isUnlocked) return 999;
  const now = Date.now();
  const elapsedMs = now - license.registeredAt;
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const remaining = license.trialDays - elapsedDays;
  return remaining > 0 ? remaining : 0;
};

export const isValidLicenseKey = (key: string): { valid: boolean; plan?: 'trial_250' | 'plan_600' | 'plan_1500'; leadLimit?: number } => {
  const clean = key.trim().toUpperCase();
  if (clean === 'MASTER-DUBAI-2026') {
    return { valid: true, plan: 'plan_1500', leadLimit: 999999 };
  }
  if (clean.startsWith('DCR-250-') || clean === 'RADAR-STARTER-250') {
    return { valid: true, plan: 'trial_250', leadLimit: 250 };
  }
  if (clean.startsWith('DCR-600-') || clean === 'RADAR-PRO-600') {
    return { valid: true, plan: 'plan_600', leadLimit: 600 };
  }
  if (clean.startsWith('DCR-1500-') || clean === 'RADAR-ENTERPRISE-1500') {
    return { valid: true, plan: 'plan_1500', leadLimit: 1500 };
  }
  return { valid: false };
};

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onSuccess?: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose, userEmail, onSuccess }) => {
  const { t } = useLanguage();
  const [keyInput, setKeyInput] = useState('');
  const [license, setLicense] = useState<TrialState>(getLicenseState(userEmail));
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLicense(getLicenseState(userEmail));
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  const remainingDays = getRemainingTrialDays(license);
  const isExpired = !license.isUnlocked && remainingDays <= 0;

  const handleApplyKey = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const check = isValidLicenseKey(keyInput);
    if (!check.valid || !check.plan || !check.leadLimit) {
      setError('Llave de acceso inválida. Contacta a soporte para adquirir o renovar tu licencia.');
      return;
    }

    const updated: TrialState = {
      ...license,
      plan: check.plan,
      leadLimit: check.leadLimit,
      isUnlocked: true,
      activationKey: keyInput.trim().toUpperCase()
    };
    localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(updated));
    setLicense(updated);
    setSuccessMsg(`¡Licencia activada con éxito! Acceso permanente al plan de ${check.leadLimit} leads habilitado.`);
    if (onSuccess) onSuccess();
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-white">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-base text-gold-300">
                {t('modals.licenseTitle', 'Commercial License & Subscription')}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {t('modals.licenseSubtitle', 'Dubai Capital Radar Enterprise SaaS')}
              </p>
            </div>
          </div>
          {!isExpired && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {t('common.close', 'Close')}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Box */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            license.isUnlocked
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : isExpired
              ? 'bg-red-950/40 border-red-500/40 text-red-200'
              : 'bg-gold-950/30 border-gold-500/30 text-gold-200'
          }`}>
            {license.isUnlocked ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : isExpired ? (
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
            )}

            <div>
              <div className="font-bold text-sm">
                {license.isUnlocked
                  ? `${t('modals.licenseStatusPro', 'Commercial License Active')}: ${license.leadLimit} Leads`
                  : isExpired
                  ? 'Trial Period Expired'
                  : `${t('modals.licenseStatusTrial', 'Free Trial Period')}: ${remainingDays} ${t('modals.licenseDaysRemaining', 'days remaining')}`}
              </div>
              <div className="text-xs text-slate-300 mt-1">
                {license.isUnlocked
                  ? `Your agency has full access for automated messaging and AI enrichment up to ${license.leadLimit} leads.`
                  : isExpired
                  ? 'To restore access for your agency, enter your commercial activation key.'
                  : 'You have 30 days of complete access and up to 250 leads to test the platform.'}
              </div>
            </div>
          </div>

          {/* Pricing Tiers Overview */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className={`p-3 rounded-xl border text-center transition-all ${
              license.plan === 'trial_250' ? 'border-gold-500 bg-gold-950/30' : 'border-slate-800 bg-slate-950/50'
            }`}>
              <span className="text-[10px] font-mono text-gold-400 uppercase font-bold">Starter Plan</span>
              <div className="font-bold text-lg text-white mt-0.5">250</div>
              <span className="text-[10px] text-slate-400">Leads / mo</span>
            </div>

            <div className={`p-3 rounded-xl border text-center transition-all ${
              license.plan === 'plan_600' ? 'border-gold-500 bg-gold-950/30' : 'border-slate-800 bg-slate-950/50'
            }`}>
              <span className="text-[10px] font-mono text-gold-400 uppercase font-bold">Pro Plan</span>
              <div className="font-bold text-lg text-white mt-0.5">600</div>
              <span className="text-[10px] text-slate-400">Leads / mo</span>
            </div>

            <div className={`p-3 rounded-xl border text-center transition-all ${
              license.plan === 'plan_1500' ? 'border-gold-500 bg-gold-950/30' : 'border-slate-800 bg-slate-950/50'
            }`}>
              <span className="text-[10px] font-mono text-gold-400 uppercase font-bold">Enterprise</span>
              <div className="font-bold text-lg text-white mt-0.5">1,500</div>
              <span className="text-[10px] text-slate-400">Leads / mo</span>
            </div>
          </div>

          {/* Key activation form */}
          <form onSubmit={handleApplyKey} className="space-y-3 pt-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300">
              {t('modals.licenseKeyLabel', 'Enter Activation License Key')}
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={t('modals.licenseKeyPlaceholder', 'DCR-PRO-XXXX-XXXX-XXXX')}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none uppercase font-mono"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-mono">⚠️ {error}</p>
            )}
            {successMsg && (
              <p className="text-xs text-emerald-400 font-mono">✓ {successMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-gold-500/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>{t('modals.activateBtn', 'Activate License')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Help note */}
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Need a key or looking to upgrade to 600 / 1,500 leads? Contact your account executive.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
