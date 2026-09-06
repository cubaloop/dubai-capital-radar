import React, { useState } from 'react';
import { Radar, FileText, Send, Building2, ShieldCheck, Activity, Users, Menu, X } from 'lucide-react';

interface NavbarProps {
  activeTab: 'crm' | 'campaigns' | 'radar' | 'dossiers' | 'inventory';
  setActiveTab: (tab: 'crm' | 'campaigns' | 'radar' | 'dossiers' | 'inventory') => void;
  selectedDossierSlug?: string;
  onOpenWhatsAppModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDossierSlug,
  onOpenWhatsAppModal
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'crm' | 'campaigns' | 'radar' | 'dossiers' | 'inventory') => {
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

          {/* WhatsApp QR Connector Action & Mobile Menu Toggle */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              <span>WhatsApp QR</span>
            </button>

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
        </div>
      )}
    </header>
  );
};
