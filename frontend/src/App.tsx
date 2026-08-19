import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { RadarDashboard } from './pages/RadarDashboard';
import { DossierView } from './pages/DossierView';
import { CampaignManager } from './pages/CampaignManager';
import { OffPlanMatcher } from './pages/OffPlanMatcher';

export function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'dossiers' | 'campaigns' | 'inventory'>('radar');
  const [selectedDossierSlug, setSelectedDossierSlug] = useState<string>('');

  const handleOpenDossier = (slug: string) => {
    setSelectedDossierSlug(slug);
    setActiveTab('dossiers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCampaigns = () => {
    setActiveTab('campaigns');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-gold-500 selection:text-slate-950">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        selectedDossierSlug={selectedDossierSlug} 
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'radar' && (
          <RadarDashboard 
            onOpenDossier={handleOpenDossier}
            onOpenCampaigns={handleOpenCampaigns}
          />
        )}

        {activeTab === 'dossiers' && (
          <DossierView 
            slugOrId={selectedDossierSlug || 'alexander-wright-fintech-demo'} 
            onBack={() => setActiveTab('radar')} 
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
          Dubai Capital Radar • Autonomous High-Net-Worth Acquisition Engine • Powered by Google Gemini & DLD Open Data
        </p>
      </footer>
    </div>
  );
}

export default App;
