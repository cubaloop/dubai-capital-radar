import React, { useState } from 'react';
import { Radar, FileText, Send, Building2, ShieldCheck, Activity, Users, Menu, X } from 'lucide-react';

interface NavbarProps {
  activeTab: 'crm' | 'campaigns' | 'legacy-campaigns' | 'radar' | 'dossiers' | 'inventory';
  setActiveTab: (tab: 'crm' | 'campaigns' | 'legacy-campaigns' | 'radar' | 'dossiers' | 'inventory') => void;
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

  const handleNavClick = (tab: 'crm' | 'campaigns' | 'legacy-campaigns' | 'radar' | 'dossiers' | 'inventory') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavClick('campaigns')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-200 flex items-center justify-center shadow-lg shadow-gold-500/20">
              <Radar className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="font-serif-luxury font-bold text-lg tracking-wider text-white flex items-center gap-1.5">
                DUBAI CAPITAL <span className="text-gold-400 font-black">RADAR & CRM</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest hidden sm:block">
                TDAH Intelligent CRM & Automated WhatsApp Outreach
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex space-x-1 sm:space-x-2">
            <button
              onClick={() => handleNavClick('crm')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'crm'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>CRM TDAH</span>
            </button>

            <button
              onClick={() => handleNavClick('campaigns')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp & Campañas</span>
            </button>

            <button
              onClick={() => handleNavClick('legacy-campaigns')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                activeTab === 'legacy-campaigns'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-105'
                  : 'text-emerald-400 border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/60'
              }`}
              title="Sistema anterior con las campañas de España 112 y Miami VIP directas"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sistema Anterior</span>
            </button>

            <button
              onClick={() => handleNavClick('radar')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'radar'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Radar Señales</span>
            </button>

            <button
              onClick={() => handleNavClick('inventory')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                activeTab === 'inventory'
                  ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Proyectos Off-Plan</span>
            </button>
          </nav>

          {/* WhatsApp QR Connector Action & Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold transition-all shadow-md shadow-emerald-500/15 active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>WhatsApp QR</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white lg:hidden"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl p-4 space-y-2 animate-fade-in">
          <button
            onClick={() => handleNavClick('crm')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'crm' ? 'bg-gold-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>CRM TDAH (Focus & Kanban)</span>
          </button>

          <button
            onClick={() => handleNavClick('campaigns')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'campaigns' ? 'bg-gold-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>WhatsApp & Campañas</span>
          </button>

          <button
            onClick={() => handleNavClick('legacy-campaigns')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'legacy-campaigns' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Sistema Anterior (España 112 / Miami)</span>
          </button>

          <button
            onClick={() => handleNavClick('radar')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'radar' ? 'bg-gold-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Radar Señales & Arbitraje Fiscal</span>
          </button>

          <button
            onClick={() => handleNavClick('inventory')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold font-mono ${
              activeTab === 'inventory' ? 'bg-gold-500 text-slate-950' : 'text-slate-300 hover:bg-slate-900'
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
