import React, { useState } from 'react';
import { Radar, FileText, Send, Building2, ShieldCheck, Activity, Users, Menu, X, LogOut, Key, FileSpreadsheet } from 'lucide-react';

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
  onLogout
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'crm' | 'campaigns' | 'excels' | 'radar' | 'dossiers' | 'inventory') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand */}
          <div className="flex items-center space-x-2 cursor-pointer shrink min-w-0" onClick={() => handleNavClick('campaigns')}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-gold-400 to-amber-200 flex items-center justify-center shadow-md shadow-gold-500/20 shrink-0">
              <Radar className="w-4 h-4 sm:w-6 sm:h-6 text-slate-950" />
            </div>
            <div className="truncate">
              <span className="font-serif-luxury font-bold text-xs sm:text-base tracking-wide text-slate-900 flex items-center gap-1 truncate">
                <span className="hidden sm:inline">DUBAI CAPITAL</span>
                <span className="sm:hidden">DUBAI</span>
                <span className="text-gold-600 font-black">RADAR</span>
              </span>
              <span className="block text-[8px] sm:text-[10px] text-slate-500 font-mono uppercase tracking-widest hidden md:block">
                CRM & WhatsApp Outreach
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex space-x-1 sm:space-x-2">
            <button
              onClick={() => handleNavClick('crm')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'crm'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>CRM TDAH</span>
            </button>

            <button
              onClick={() => handleNavClick('campaigns')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp & Campañas</span>
            </button>

            <button
              onClick={() => handleNavClick('excels')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'excels'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Gestor Excels</span>
            </button>

            <button
              onClick={() => handleNavClick('radar')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'radar'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Radar Señales</span>
            </button>

            <button
              onClick={() => handleNavClick('inventory')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'inventory'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Off-Plan</span>
            </button>
          </nav>

          {/* Trial Days Countdown, Agency Settings, WhatsApp QR & Mobile Menu Toggle */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {onOpenLicenseModal && (
              <button
                onClick={onOpenLicenseModal}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold border transition-all active:scale-95 ${
                  isUnlocked
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : remainingTrialDays > 0
                    ? 'bg-amber-950/80 border-gold-500/50 text-gold-300 shadow-sm shadow-gold-500/10'
                    : 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                }`}
                title={isUnlocked ? 'Licencia Comercial Verificada' : `${remainingTrialDays} días de prueba restantes`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>
                  {isUnlocked ? 'Licencia Pro' : `${remainingTrialDays}d Gratis`}
                </span>
              </button>
            )}

            {onOpenAgencyModal && (
              <button
                onClick={onOpenAgencyModal}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-gold-400 text-[11px] sm:text-xs font-bold border border-gold-500/30 transition-all shadow-sm active:scale-95"
                title="Configuración de Agencia B2B"
              >
                <Building2 className="w-3.5 h-3.5 text-gold-400" />
                <span>Agencia B2B</span>
              </button>
            )}

            <button
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              <span>WhatsApp QR</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 text-xs font-mono transition-all"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 lg:hidden shrink-0"
              aria-label="Abrir menú"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl p-4 space-y-2 shadow-2xl animate-fade-in">
          <button
            onClick={() => handleNavClick('crm')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'crm' ? 'bg-gold-500 text-slate-950' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>CRM TDAH (Focus & Kanban)</span>
          </button>

          <button
            onClick={() => handleNavClick('campaigns')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'campaigns' ? 'bg-gold-500 text-slate-950' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp & Campañas</span>
          </button>

          <button
            onClick={() => handleNavClick('excels')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'excels' ? 'bg-gold-500 text-slate-950' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Gestor Excels (Campañas y Leads)</span>
          </button>

          <button
            onClick={() => handleNavClick('radar')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'radar' ? 'bg-gold-500 text-slate-950' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Radar Señales & Arbitraje Fiscal</span>
          </button>

          <button
            onClick={() => handleNavClick('inventory')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'inventory' ? 'bg-gold-500 text-slate-950' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Proyectos Dubai Off-Plan</span>
          </button>

          {onOpenAgencyModal && (
            <button
              onClick={() => {
                onOpenAgencyModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono text-gold-600 bg-slate-900"
            >
              <Building2 className="w-4 h-4" />
              <span>Configuración Agencia B2B</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
