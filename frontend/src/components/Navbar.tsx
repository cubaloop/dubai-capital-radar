import React, { useState } from 'react';
import { Radar, Send, Building2, Users, Menu, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { NavbarHamburgerMenu } from './NavbarHamburgerMenu';

interface NavbarProps {
  activeTab: 'crm' | 'campaigns' | 'excels' | 'radar' | 'dossiers' | 'inventory';
  setActiveTab: (tab: 'crm' | 'campaigns' | 'excels' | 'radar' | 'dossiers' | 'inventory') => void;
  selectedDossierSlug?: string;
  onOpenWhatsAppModal: () => void;
  onOpenAgencyModal?: () => void;
  onOpenLicenseModal?: () => void;
  remainingTrialDays?: number;
  isUnlocked?: boolean;
  onLogout?: () => void;
  currentUser?: { email: string; name: string; role: string; agencyName: string; logoUrl?: string };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDossierSlug,
  onOpenWhatsAppModal,
  onOpenAgencyModal,
  onOpenLicenseModal,
  remainingTrialDays = 30,
  isUnlocked = false,
  onLogout,
  currentUser
}) => {
  const { t } = useTranslation();
  const { currency, config } = useCurrency();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (tab: 'crm' | 'campaigns' | 'excels' | 'radar' | 'dossiers' | 'inventory') => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* 1. Left: Brand Logo & Title */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer shrink min-w-0 select-none"
              onClick={() => handleNavClick('campaigns')}
            >
              {currentUser?.logoUrl ? (
                <img
                  src={currentUser.logoUrl}
                  alt={currentUser.agencyName || 'H.O.M.E Properties'}
                  className="h-9 sm:h-10 w-auto max-w-[120px] object-contain rounded-lg p-0.5 bg-black"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-gold-400 to-amber-200 flex items-center justify-center shadow-md shadow-gold-500/20 shrink-0">
                  <Radar className="w-4 h-4 sm:w-6 sm:h-6 text-slate-950" />
                </div>
              )}
              <div className="truncate">
                <span className="font-serif-luxury font-bold text-xs sm:text-base tracking-wide text-slate-900 flex items-center gap-1 truncate">
                  {currentUser?.agencyName ? (
                    <span>{currentUser.agencyName}</span>
                  ) : (
                    <>
                      <span className="hidden sm:inline">DUBAI CAPITAL</span>
                      <span className="sm:hidden">DUBAI</span>
                      <span className="text-gold-600 font-black">RADAR</span>
                    </>
                  )}
                </span>
                <span className="block text-[8px] sm:text-[10px] text-slate-500 font-mono uppercase tracking-widest hidden md:block">
                  {t('nav.brandSub', 'CRM & WhatsApp Outreach')}
                </span>
              </div>
            </div>

            {/* 2. Center: Primary Category Navigation Tabs (Untouched) */}
            <nav className="hidden lg:flex space-x-1 sm:space-x-2">
              <button
                type="button"
                onClick={() => handleNavClick('crm')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeTab === 'crm'
                    ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{t('nav.crmLeads', 'CRM Leads')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('campaigns')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeTab === 'campaigns'
                    ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{t('nav.whatsappCampaigns', 'WhatsApp & Campaigns')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('excels')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeTab === 'excels'
                    ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t('nav.excelManager', 'Excel Manager')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('inventory')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{t('nav.offPlan', 'Off-Plan')}</span>
              </button>
            </nav>

            {/* 3. Right: Clean Unified Hamburger Menu Trigger */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Currency Badge Pill */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-mono font-bold transition-all"
                title={t('nav.currencyLabel', 'System Currency')}
              >
                <span>{config.flag}</span>
                <span>{currency}</span>
              </button>

              {/* Master Hamburger Menu Button */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-white border border-slate-800 transition-all shadow-md shadow-slate-950/20 active:scale-95 group"
                aria-label={t('nav.openMenu', 'Open Menu')}
              >
                <Menu className="w-4 h-4 text-gold-400 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-xs font-mono font-bold tracking-wider hidden sm:inline text-slate-200 group-hover:text-gold-300">
                  {t('nav.menuTitle', 'Menu')}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="WhatsApp Connected"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out Hamburger Drawer */}
      <NavbarHamburgerMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentUser={currentUser}
        onOpenLicenseModal={onOpenLicenseModal}
        onOpenAgencyModal={onOpenAgencyModal}
        onOpenWhatsAppModal={onOpenWhatsAppModal}
        remainingTrialDays={remainingTrialDays}
        isUnlocked={isUnlocked}
        onLogout={onLogout}
        activeTab={activeTab}
        onSelectTab={handleNavClick}
      />
    </>
  );
};
