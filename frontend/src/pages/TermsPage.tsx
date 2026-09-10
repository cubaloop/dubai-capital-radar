import React, { useState } from 'react';

export const TermsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('acceptance');

  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'service', title: '2. Description of Service' },
    { id: 'accounts', title: '3. User Accounts & Registration' },
    { id: 'whatsapp', title: '4. WhatsApp Usage Policy' },
    { id: 'privacy', title: '5. Data Processing & Privacy' },
    { id: 'acceptable', title: '6. Acceptable Use Policy' },
    { id: 'payment', title: '7. Subscription & Payment Terms' },
    { id: 'ip', title: '8. Intellectual Property' },
    { id: 'liability', title: '9. Limitation of Liability' },
    { id: 'law', title: '10. Governing Law' },
    { id: 'contact', title: '11. Contact Information' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-gold-500 selection:text-slate-950 pt-20">
      <nav className="fixed top-0 w-full z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <a href="/" className="text-xl font-black flex items-center gap-2">
            <span className="text-gold-500">✈️</span> OUTPILOT
          </a>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold mb-4 text-slate-400 uppercase text-xs tracking-wider">Contents</h3>
            <ul className="space-y-2 text-sm">
              {sections.map(s => (
                <li key={s.id}>
                  <button 
                    onClick={() => setActiveSection(s.id)}
                    className={`text-left w-full px-3 py-2 rounded-lg transition ${activeSection === s.id ? 'bg-gold-50 text-gold-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="flex-1 bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm prose prose-slate max-w-none">
          <h1 className="text-3xl font-black mb-2">Terms & Conditions</h1>
          <p className="text-sm text-slate-500 mb-8">Last Updated: September 2026</p>
          
          <div className="space-y-8">
            <section id="acceptance" className={activeSection === 'acceptance' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p>By accessing or using Outpilot's SaaS platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services.</p>
            </section>

            <section id="service" className={activeSection === 'service' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
              <p>Outpilot is an AI-powered CRM and lead outreach platform designed to automate WhatsApp communications and manage sales pipelines.</p>
            </section>

            <section id="accounts" className={activeSection === 'accounts' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">3. User Accounts & Registration</h2>
              <p>You must provide accurate and complete information during registration. You are responsible for safeguarding your account credentials and for all activities occurring under your account.</p>
            </section>

            <section id="whatsapp" className={activeSection === 'whatsapp' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">4. WhatsApp Usage Policy</h2>
              <div className="bg-red-50 text-red-900 p-4 rounded-xl border border-red-200 mb-4">
                <strong>CRITICAL:</strong> Users are solely responsible for their WhatsApp compliance. Outpilot provides tools for connectivity (Official API and Baileys Web API).
              </div>
              <p>The Official WhatsApp Business API is the recommended method. Use of the Baileys integration is at your own risk. Outpilot is strictly not liable for any WhatsApp account bans, restrictions, or data loss resulting from your messaging practices or use of unofficial endpoints.</p>
            </section>

            <section id="privacy" className={activeSection === 'privacy' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">5. Data Processing & Privacy</h2>
              <p>We process data in compliance with GDPR and UAE PDPL regulations. Outpilot acts as a data processor for the leads you upload. We do not sell or share your leads.</p>
            </section>

            <section id="acceptable" className={activeSection === 'acceptable' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">6. Acceptable Use Policy</h2>
              <p>You agree not to use the service for spam, illegal contacts, or unsolicited messaging. All uploaded lead lists must be opt-in or legally obtained.</p>
            </section>

            <section id="payment" className={activeSection === 'payment' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">7. Subscription & Payment Terms</h2>
              <p>Subscriptions are billed monthly across our Starter, Professional, and Enterprise tiers. You may cancel at any time, but no refunds will be provided for partial months.</p>
            </section>

            <section id="ip" className={activeSection === 'ip' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">8. Intellectual Property</h2>
              <p>Outpilot retains all rights, title, and interest in and to the platform, including all associated intellectual property rights.</p>
            </section>

            <section id="liability" className={activeSection === 'liability' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
              <p>Outpilot shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the service.</p>
            </section>

            <section id="law" className={activeSection === 'law' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">10. Governing Law</h2>
              <p>These terms shall be governed by and construed in accordance with the laws of the United Arab Emirates. Any disputes shall be subject to the exclusive jurisdiction of the DIFC Courts.</p>
            </section>

            <section id="contact" className={activeSection === 'contact' ? 'block' : 'hidden'}>
              <h2 className="text-2xl font-bold mb-4">11. Contact Information</h2>
              <p>For any questions regarding these Terms, please contact us at <strong>support@outpilot.ae</strong>.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};
