import React from 'react';
import {
  X,
  Building2,
  Key,
  LogOut,
  Globe,
  Coins,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Users,
  Send,
  FileSpreadsheet
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSwitch } from './LanguageSwitch';
import { CurrencySwitch } from './CurrencySwitch';

interface NavbarHamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    email: string;
    name: string;
    role: string;
    agencyName: string;
    logoUrl?: string;
  };
  onOpenLicenseModal?: () => void;
  onOpenAgencyModal?: () => void;
  onOpenWhatsAppModal: () => void;
  remainingTrialDays?: number;
  isUnlocked?: boolean;
  onLogout?: () => void;
  activeTab: string;
  onSelectTab: (tab: any) => void;
}

export const NavbarHamburgerMenu: React.FC<NavbarHamburgerMenuProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenLicenseModal,
  onOpenAgencyModal,
  onOpenWhatsAppModal,
  remainingTrialDays = 30,
  isUnlocked = false,
  onLogout,
  activeTab,
  onSelectTab
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-md bg-slate-950/95 border-l border-slate-800 text-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/60">
          <div>
            <span className="font-serif-luxury font-bold text-base tracking-wide text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gold-400 shadow-sm shadow-gold-400/50 animate-pulse"></span>
              {t('nav.menuTitle', 'Workspace & System')}
            </span>
            <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
              {t('nav.menuSubtitle', 'Agency Preferences & Platform Tools')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Section 1: User & Agency Profile Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-850 border border-slate-800 shadow-md">
            <div className="flex items-start gap-3.5">
              {currentUser?.logoUrl ? (
                <img
                  src={currentUser.logoUrl}
                  alt={currentUser.agencyName}
                  className="w-11 h-11 object-contain rounded-xl p-1 bg-black border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-gold-400 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md shadow-gold-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white truncate">
                    {currentUser?.agencyName || 'H.O.M.E Properties'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-400/30 shrink-0">
                    {currentUser?.role || 'Senior Broker'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {currentUser?.email || 'home@homeproperties.ae'}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Multi-Tenant Enterprise RLS Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Global Preferences (Currency & Language) */}
          <div className="space-y-4 pt-2">
            {/* Currency Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Coins className="w-3.5 h-3.5 text-gold-400" />
                  {t('nav.currencyLabel', 'System Currency')}
                </span>
                <span className="text-[10px] text-gold-400 uppercase tracking-widest font-bold">
                  Default: AED (د.إ)
                </span>
              </div>
              <div className="w-full">
                <CurrencySwitch className="w-full justify-between" />
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  {t('nav.languageLabel', 'System Language')}
                </span>
                <span className="text-[10px] text-sky-400 uppercase tracking-widest font-bold">
                  Default: English
                </span>
              </div>
              <div className="flex justify-start">
                <LanguageSwitch />
              </div>
            </div>
          </div>

          {/* Section 3: Platform Tools & Management */}
          <div className="space-y-2.5 pt-4 border-t border-slate-800">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-1">
              {t('nav.toolsSection', 'Platform Integrations')}
            </span>

            {/* WhatsApp Gateway Modal Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWhatsAppModal();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-emerald-500/30 hover:border-emerald-500/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{t('nav.qrModal', 'WhatsApp QR')}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Baileys Multi-Device Anti-Ban Gateway
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </button>

            {/* B2B Agency Modal Button */}
            {onOpenAgencyModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAgencyModal();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-gold-500/30 hover:border-gold-500/60 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/40">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">
                      {t('nav.agencyConfigSub', 'B2B Agency Settings')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Persona, Dubai Market & Currency
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-gold-400 transition-colors" />
              </button>
            )}

            {/* License Modal Button */}
            {onOpenLicenseModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLicenseModal();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                    isUnlocked
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-500/20 text-gold-400 border-gold-500/40'
                  }`}>
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">
                      {isUnlocked ? t('modals.licenseStatusPro', 'Commercial License') : t('nav.proLicense', 'Pro License')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isUnlocked
                        ? 'Unlimited Enterprise Tier Active'
                        : `${remainingTrialDays} ${t('nav.freeTrial', 'days free trial remaining')}`}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold ${
                  isUnlocked
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-600/40'
                    : 'bg-amber-950 text-gold-300 border-gold-500/40'
                }`}>
                  {isUnlocked ? 'ACTIVE' : `${remainingTrialDays}d`}
                </span>
              </button>
            )}
          </div>

          {/* Section 4: Mobile Category Links (Visible for small screens) */}
          <div className="space-y-2 pt-4 border-t border-slate-800 lg:hidden">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-1">
              {t('nav.categoriesSection', 'Modules Navigation')}
            </span>

            <button
              onClick={() => {
                onSelectTab('crm');
                onClose();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition ${
                activeTab === 'crm'
                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t('nav.crmLeads', 'CRM Leads')}</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('campaigns');
                onClose();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition ${
                activeTab === 'campaigns'
                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{t('nav.whatsappCampaigns', 'WhatsApp & Campaigns')}</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('excels');
                onClose();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition ${
                activeTab === 'excels'
                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('nav.excelManager', 'Excel Manager')}</span>
            </button>

            <button
              onClick={() => {
                onSelectTab('inventory');
                onClose();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition ${
                activeTab === 'inventory'
                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{t('nav.offPlan', 'Off-Plan')}</span>
            </button>
          </div>
        </div>

        {/* Bottom Drawer Footer: Logout Action */}
        {onLogout && (
          <div className="p-5 border-t border-slate-800 bg-slate-900/60">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-3 px-4 rounded-xl text-xs font-mono font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/80 border border-red-800/40 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout', 'Log Out')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
