import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CRMView } from './pages/CRMView';
import { CampaignManager } from './pages/CampaignManager';
import { ExcelCampaignDashboard } from './pages/ExcelCampaignDashboard';
import { DossierView } from './pages/DossierView';
import { WhatsAppQRModal } from './components/WhatsAppQRModal';
import { AgencySettingsModal } from './components/AgencySettingsModal';
import { LicenseModal, getLicenseState, getRemainingTrialDays } from './components/LicenseModal';
import { AuthScreen } from './pages/AuthScreen';
import { LandingPage } from './pages/LandingPage';
import { AgencyOnboarding } from './pages/AgencyOnboarding';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { TermsPage } from './pages/TermsPage';
import { DemoBanner } from './components/DemoBanner';
import { useTranslation } from './i18n/LanguageContext';

function DemoLauncher() {
  const navigate = useNavigate();
  useEffect(() => {
    localStorage.setItem('outpilot_demo_mode', 'true');
    const demoUser = {
      email: 'demo@outpilot.ae',
      name: 'Demo Visitor',
      role: 'agency_owner',
      agencyName: 'Outpilot Sample Agency',
      plan: 'free',
      messagesUsed: 18,
      messagesLimit: 500,
    };
    localStorage.setItem('dcr_user_session', JSON.stringify(demoUser));
    // Trigger seed in background
    fetch('/api/demo/seed', { method: 'POST' }).catch(() => {});
    navigate('/crm?demo=true');
    window.location.reload();
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-mono text-sm">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        <span>Cargando entorno demo interactivo...</span>
      </div>
    </div>
  );
}

export function App() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('dcr_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState<boolean>(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [licenseState, setLicenseState] = useState(() => getLicenseState(currentUser?.email));

  useEffect(() => {
    setLicenseState(getLicenseState(currentUser?.email));
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('dcr_user_session');
    localStorage.removeItem('outpilot_demo_mode');
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full page-bg text-primary flex flex-col font-sans overflow-x-hidden transition-colors duration-200">
      <DemoBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoLauncher />} />
        <Route path="/login" element={<AuthScreen />} />
        <Route path="/register" element={<AuthScreen />} />
        <Route path="/onboarding" element={<AgencyOnboarding />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<TermsPage />} />
        <Route
          path="/*"
          element={
            <>
              {currentUser ? (
                <>
                  <Navbar 
                    activeTab="campaigns" // Fallback since we removed the state
                    setActiveTab={(tab) => navigate(`/${tab}`)} 
                    onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
                    onOpenAgencyModal={() => setIsAgencyModalOpen(true)}
                    onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
                    remainingTrialDays={getRemainingTrialDays(licenseState)}
                    isUnlocked={licenseState.isUnlocked}
                    onLogout={handleLogout}
                    currentUser={currentUser}
                  />
                  <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-8">
                    <Routes>
                      <Route path="/crm" element={<CRMView currentUser={currentUser} />} />
                      <Route path="/campaigns" element={<CampaignManager currentUser={currentUser} />} />
                      <Route path="/analytics" element={<AnalyticsDashboard />} />
                      <Route path="/excels" element={<ExcelCampaignDashboard currentUser={currentUser} />} />
                      <Route path="/dossiers/:slug?" element={<DossierView slugOrId="alexander-wright-fintech-demo" onBack={() => navigate('/campaigns')} />} />
                      <Route path="*" element={<Navigate to="/campaigns" replace />} />
                    </Routes>
                  </main>
                  <WhatsAppQRModal isOpen={isWhatsAppModalOpen} onClose={() => setIsWhatsAppModalOpen(false)} />
                  <AgencySettingsModal isOpen={isAgencyModalOpen} onClose={() => setIsAgencyModalOpen(false)} />
                  <LicenseModal
                    isOpen={isLicenseModalOpen}
                    onClose={() => setIsLicenseModalOpen(false)}
                    userEmail={currentUser?.email}
                    onSuccess={() => setLicenseState(getLicenseState(currentUser?.email))}
                  />
                </>
              ) : (
                <Navigate to="/login" replace />
              )}
            </>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
