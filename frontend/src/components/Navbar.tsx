import React, { useState } from 'react';
import { Radar, Send, Building2, Users, Menu, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import React, { useState } from 'react';
import { Menu, Users, Send, FileSpreadsheet, Building2, BarChart3, ChevronDown, User, Settings, LogOut, CheckCircle } from 'lucide-react';
import { NavbarHamburgerMenu } from './NavbarHamburgerMenu';
import { useTranslation } from '../i18n/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true';

  const handleNavClick = (tab: string) => {
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
              <div className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span className="text-gold-500">✈️</span> OUTPILOT
                {isDemo && (
                  <span className="ml-2 bg-gold-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Demo</span>
                )}
              </div>
            </div>

            {/* 2. Center: Primary Category Navigation Tabs */}
            <nav className="hidden lg:flex space-x-1 sm:space-x-2">
              <button
                type="button"
                onClick={() => handleNavClick('crm')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeTab === 'crm'
                    ? 'bg-gold-500 text-slate-950 shadow-md scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>CRM Leads</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('campaigns')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeTab === 'campaigns'
                    ? 'bg-gold-500 text-slate-950 shadow-md scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Campaigns</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('analytics')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-gold-500 text-slate-950 shadow-md scale-105'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
            </nav>

            {/* 3. Right: User Menu & Mobile Hamburger */}
            <div className="flex items-center gap-4 shrink-0">
              {/* User Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded-xl transition"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100 mb-2">
                      <div className="font-bold text-sm truncate">{currentUser?.name || 'User'}</div>
                      <div className="text-xs text-slate-500 truncate">{currentUser?.agencyName || 'Agency'}</div>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                      <User className="w-4 h-4" /> Profile
                    </button>
                    <button 
                      onClick={() => { setIsUserMenuOpen(false); onOpenAgencyModal?.(); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" /> Agency Settings
                    </button>
                    <button 
                      onClick={() => { setIsUserMenuOpen(false); onLogout?.(); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Master Hamburger Menu Button (Mobile mostly) */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-white border border-slate-800 transition-all shadow-md active:scale-95 group"
              >
                <Menu className="w-4 h-4 text-gold-400 group-hover:rotate-90 transition-transform duration-300" />
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
        activeTab={activeTab as any}
        onSelectTab={handleNavClick as any}
      />
    </>
  );
};
