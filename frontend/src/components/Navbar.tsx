import React from 'react';
import { Radar, FileText, Send, Building2, ShieldCheck, Activity } from 'lucide-react';

interface NavbarProps {
  activeTab: 'radar' | 'dossiers' | 'campaigns' | 'inventory';
  setActiveTab: (tab: 'radar' | 'dossiers' | 'campaigns' | 'inventory') => void;
  selectedDossierSlug?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedDossierSlug
}) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('radar')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-200 flex items-center justify-center shadow-lg shadow-gold-500/20">
              <Radar className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="font-serif-luxury font-bold text-lg tracking-wider text-white flex items-center gap-1.5">
                DUBAI CAPITAL <span className="text-gold-400 font-black">RADAR</span>
              </span>
              <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                Predictive HNWI Infiltration & Wealth Arbitrage
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('radar')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'radar'
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Liquidity Radar</span>
            </button>

            <button
              onClick={() => setActiveTab('dossiers')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dossiers'
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Private Dossier {selectedDossierSlug && <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse"></span>}</span>
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Outreach & AI Triage</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'inventory'
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Dubai Off-Plan</span>
            </button>
          </nav>

          {/* Golden Visa Status indicator */}
          <div className="hidden lg:flex items-center space-x-3 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>DLD Escrow + 10-Yr Golden Visa Engine</span>
          </div>
        </div>
      </div>
    </header>
  );
};
