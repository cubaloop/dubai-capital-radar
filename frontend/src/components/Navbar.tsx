import React, { useState } from 'react';
import { Menu, Users, Send, FileSpreadsheet, BarChart3, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { NavbarHamburgerMenu } from './NavbarHamburgerMenu';
import { useTranslation } from '../i18n/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { ThemeToggleButton } from '../context/ThemeContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedDossierSlug?: string;
  onOpenWhatsAppModal: () => void;
  onOpenAgencyModal?: () => void;
  onOpenLicenseModal?: () => void;
  remainingTrialDays?: number;
  isUnlocked?: boolean;
  currentUser?: {
    email: string;
    name: string;
    role: string;
    agencyName: string;
    logoUrl?: string;
    messagesLimit?: number;
    messagesUsed?: number;
    plan?: string;
  };
  onLogout?: () => void;
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

  const navItems = [
    { key: 'crm', label: 'CRM Leads', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'campaigns', label: 'Campaigns', icon: <Send className="w-3.5 h-3.5" /> },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <header className="navbar sticky top-0 z-40 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">

            {/* Brand */}
            <div
              className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none"
              onClick={() => handleNavClick('campaigns')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-gold-500 to-gold-700 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Outpilot
              </span>
              {isDemo && (
                <span className="bg-gold-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Demo
                </span>
              )}
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    activeTab === item.key
                      ? 'bg-gold-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">

              {/* AI Messages Quota Pill */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span>🎁</span>
                <span>{currentUser?.messagesLimit && currentUser.messagesLimit !== -1 ? `${Math.max(0, (currentUser.messagesLimit - (currentUser.messagesUsed || 0)))} / ${currentUser.messagesLimit} msgs IA` : '500 msgs IA gratis'}</span>
              </div>

              {/* Theme Toggle */}
              <ThemeToggleButton className="hidden sm:inline-flex" />

              {/* WhatsApp status indicator */}
              <button
                onClick={onOpenWhatsAppModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                  bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400
                  border border-emerald-200 dark:border-emerald-800/50
                  hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                title="WhatsApp Gateway"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>WhatsApp</span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1.5 rounded-xl transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center font-bold text-slate-900 text-xs shadow-sm">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {currentUser?.name || 'User'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {currentUser?.agencyName || 'Agency'}
                        </div>
                      </div>
                      {/* Theme toggle inside menu for mobile */}
                      <div className="px-3 py-1.5 sm:hidden">
                        <ThemeToggleButton className="w-full justify-center" />
                      </div>
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                        <User className="w-3.5 h-3.5" /> Profile
                      </button>
                      <button
                        onClick={() => { setIsUserMenuOpen(false); onOpenAgencyModal?.(); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" /> Agency Settings
                      </button>
                      <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                        <button
                          onClick={() => { setIsUserMenuOpen(false); onLogout?.(); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-700 text-white shadow-md active:scale-95 transition-all"
              >
                <Menu className="w-4 h-4 text-gold-400" />
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
