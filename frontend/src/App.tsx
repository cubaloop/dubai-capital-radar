import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RadarDashboard } from './pages/RadarDashboard';
import { DossierView } from './pages/DossierView';
import { CampaignManager } from './pages/CampaignManager';
import { OffPlanMatcher } from './pages/OffPlanMatcher';
import { WhatsAppQRModal } from './components/WhatsAppQRModal';
import { Lock, ShieldCheck, PhoneCall, Calendar } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'dossiers' | 'campaigns' | 'inventory'>('radar');
  const [selectedDossierSlug, setSelectedDossierSlug] = useState<string>('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isClientDirectView, setIsClientDirectView] = useState<boolean>(false);

  // Parse direct URL on initial mount and browser navigation
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith('/dossier/')) {
        const slug = path.replace('/dossier/', '').split('/')[0].split('?')[0];
        if (slug) {
          setSelectedDossierSlug(slug);
          setActiveTab('dossiers');
          setIsClientDirectView(true);
          return;
        }
      }
      setIsClientDirectView(false);
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  const handleOpenDossier = (slug: string) => {
    setSelectedDossierSlug(slug);
    setActiveTab('dossiers');
    setIsClientDirectView(false);
    window.history.pushState(null, '', `/dossier/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCampaigns = () => {
    setActiveTab('campaigns');
    setIsClientDirectView(false);
    window.history.pushState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: 'radar' | 'dossiers' | 'campaigns' | 'inventory') => {
    setActiveTab(tab);
    setIsClientDirectView(false);
    if (tab === 'dossiers' && selectedDossierSlug) {
      window.history.pushState(null, '', `/dossier/${selectedDossierSlug}`);
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-gold-500 selection:text-slate-950">
      {/* If the prospect is viewing directly via their link, show an exclusive private banking header */}
      {isClientDirectView ? (
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md py-3.5 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-200 flex items-center justify-center shadow-lg shadow-gold-500/20">
                <ShieldCheck className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="font-serif-luxury font-bold text-base tracking-wider text-white">
                  DUBAI CAPITAL <span className="text-gold-400 font-black">ADVISORY</span>
                </span>
                <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                  Private Wealth & Sovereign Asset Structuring • DIFC
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/971501378020?text=Hello,%20I%20am%20reviewing%20my%20Confidential%20Dubai%20Wealth%20Dossier."
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-600/40 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/60 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" /> +971 50 137 8020
              </a>
              <div className="inline-flex items-center gap-1.5 text-xs text-gold-400 font-mono bg-gold-950/60 border border-gold-800/60 px-3 py-1.5 rounded-xl">
                <Lock className="w-3.5 h-3.5" /> CONFIDENTIAL
              </div>
            </div>
          </div>
        </header>
      ) : (
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={handleTabChange} 
          selectedDossierSlug={selectedDossierSlug} 
          onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        />
      )}

      <WhatsAppQRModal 
        isOpen={isWhatsAppModalOpen} 
        onClose={() => setIsWhatsAppModalOpen(false)} 
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'radar' && (
          <RadarDashboard 
            onOpenDossier={handleOpenDossier}
            onOpenCampaigns={handleOpenCampaigns}
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
          />
        )}

        {activeTab === 'dossiers' && (
          <DossierView 
            slugOrId={selectedDossierSlug || 'alexander-wright-fintech-demo'} 
            onBack={() => handleTabChange('radar')} 
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignManager />
        )}

        {activeTab === 'inventory' && (
          <OffPlanMatcher />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <p className="font-mono">
          Dubai Capital Advisory • Sovereign Wealth & Golden Visa Gateway • DIFC • Dubai Land Department Registered
        </p>
      </footer>
    </div>
  );
}

export default App;
