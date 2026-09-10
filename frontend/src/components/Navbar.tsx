import React, { useState } from 'react';
import { 
  Menu, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  MessageSquare, 
  Sparkles, 
  CreditCard, 
  Globe,
  Bell,
  Search
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { ThemeToggleButton } from '../context/ThemeContext';

interface NavbarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  selectedDossierSlug?: string;
  onOpenWhatsAppModal: () => void;
  onOpenAgencyModal?: () => void;
  onOpenLicenseModal?: () => void;
  onToggleMobileSidebar?: () => void;
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
  onOpenWhatsAppModal,
  onOpenAgencyModal,
  onOpenLicenseModal,
  onToggleMobileSidebar,
  onLogout,
  currentUser
}) => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true';

  return (
    <header className="sticky top-0 z-30 w-full h-16 px-4 sm:px-6 flex items-center justify-between
      bg-[#FFFFFF]/80 dark:bg-[#28243D]/80 backdrop-blur-md
      border-b border-[rgba(58,53,65,0.08)] dark:border-[rgba(231,227,252,0.08)]
      transition-colors duration-200"
    >
      {/* Left section: Hamburger for Mobile + Search / Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Quick Search Bar / Context (Materio Style) */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#312D4B] text-slate-400 text-xs w-48 md:w-64 border border-transparent focus-within:border-[#8C57FF] focus-within:bg-white dark:focus-within:bg-[#28243D] transition">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Buscar en Outpilot..." 
            className="bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-xs w-full placeholder:text-slate-400"
          />
          <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">⌘K</span>
        </div>
      </div>

      {/* Right section: Status, Quota, Theme Toggle & Profile */}
      <div className="flex items-center gap-2.5">
        
        {/* AI Messages Quota Badge (Materio Pill) */}
        <div 
          onClick={onOpenLicenseModal}
          className="cursor-pointer hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
            bg-[#8C57FF]/10 text-[#8C57FF] border border-[#8C57FF]/20 hover:bg-[#8C57FF]/20 transition"
          title="Ver saldo de mensajes IA y planes"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8C57FF]" />
          <span>
            {currentUser?.messagesLimit && currentUser.messagesLimit !== -1 
              ? `${Math.max(0, currentUser.messagesLimit - (currentUser.messagesUsed || 0))} / ${currentUser.messagesLimit} msgs IA` 
              : '500 msgs IA gratis'}
          </span>
        </div>

        {/* WhatsApp Gateway Quick Connect Button */}
        <button
          onClick={onOpenWhatsAppModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
            bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400
            border border-emerald-200 dark:border-emerald-800/50
            hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition shadow-sm"
          title="Ver estado de conexión WhatsApp"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden md:inline">WhatsApp</span>
        </button>

        {/* Theme Toggle (Sun/Moon) */}
        <ThemeToggleButton className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8C57FF] to-[#6A3EC4] flex items-center justify-center text-white font-bold text-xs shadow-md shadow-[#8C57FF]/25">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-extrabold text-slate-950 dark:text-white leading-tight">
                {currentUser?.name || 'David Admin'}
              </span>
              <span className="text-[10px] text-slate-800 dark:text-slate-300 font-bold leading-tight">
                {currentUser?.agencyName || 'Outpilot CRM'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-700 dark:text-slate-300 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsUserMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#28243D] border border-slate-300 dark:border-[#3A354C] shadow-2xl z-50 p-2 text-xs divide-y divide-slate-200 dark:divide-slate-800 font-sans">
                <div className="p-3">
                  <p className="font-extrabold text-slate-950 dark:text-white text-sm">
                    {currentUser?.name || 'Administrador'}
                  </p>
                  <p className="text-slate-750 dark:text-slate-200 font-bold truncate mt-0.5">{currentUser?.email}</p>
                  <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-[#8C57FF]/15 text-[#8C57FF] text-[10px] font-black uppercase">
                    Plan {currentUser?.plan || 'Free Trial'}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAgencyModal?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 hover:bg-[#8C57FF]/15 hover:text-[#8C57FF] transition font-bold text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>Ajustes de Agencia</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenLicenseModal?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 hover:bg-[#8C57FF]/15 hover:text-[#8C57FF] transition font-bold text-left"
                  >
                    <CreditCard className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>Planes y Licencia</span>
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-bold text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
};
