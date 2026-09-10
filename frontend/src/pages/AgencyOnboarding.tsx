import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Shield, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';

export const AgencyOnboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [useBaileys, setUseBaileys] = useState(false);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-black mb-2">Agency Onboarding</h1>
        <p className="text-slate-400 mb-8">Set up your workspace and connect WhatsApp.</p>
        
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-gold-500 text-slate-950 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Agency Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Agency Name</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-gold-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Website</label>
                <input type="url" className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-gold-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Industry</label>
                <select className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-gold-500 outline-none">
                  <option>Real Estate</option>
                  <option>Financial Services</option>
                  <option>Insurance</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3 bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold rounded-xl mt-4">Next Step</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-gold-500 text-slate-950 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              WhatsApp Configuration
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Official API */}
              <div 
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${!useBaileys ? 'border-gold-500 bg-gold-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                onClick={() => setUseBaileys(false)}
              >
                <div className="flex justify-between items-start mb-2">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  {!useBaileys && <CheckCircle className="w-5 h-5 text-gold-500" />}
                </div>
                <h3 className="font-bold mb-1">WhatsApp Business API</h3>
                <p className="text-xs text-slate-400">Recommended. Official Meta integration, no ban risk.</p>
              </div>

              {/* Baileys */}
              <div 
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${useBaileys ? 'border-gold-500 bg-gold-500/10' : 'border-slate-800 hover:border-slate-700'}`}
                onClick={() => setUseBaileys(true)}
              >
                <div className="flex justify-between items-start mb-2">
                  <Smartphone className="w-6 h-6 text-slate-400" />
                  {useBaileys && <CheckCircle className="w-5 h-5 text-gold-500" />}
                </div>
                <h3 className="font-bold mb-1">Baileys (Web API)</h3>
                <p className="text-xs text-slate-400">Advanced. Connect personal number via QR code.</p>
              </div>
            </div>

            {!useBaileys ? (
              <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-1">API Key</label>
                  <input type="text" placeholder="From 360dialog or Meta" className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-gold-500 outline-none" />
                  <a href="#" className="text-xs text-gold-500 mt-1 inline-block">Get your API key from 360dialog</a>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-1">Phone Number ID</label>
                  <input type="text" className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-gold-500 outline-none" />
                </div>
              </div>
            ) : (
              <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl">
                <div className="flex gap-3 text-red-400 mb-3">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <p className="text-sm"><strong>Warning:</strong> Using Baileys is not officially supported by WhatsApp/Meta and may result in account bans. Use at your own risk.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={acceptRisk} onChange={e => setAcceptRisk(e.target.checked)} className="accent-red-500" />
                  <span className="text-sm">I understand and accept the risks</span>
                </label>
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl">Back</button>
              <button 
                onClick={() => setStep(3)} 
                disabled={useBaileys && !acceptRisk}
                className="flex-1 py-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <h2 className="text-xl font-bold mb-4">Connect & Test</h2>
            
            <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 inline-block mb-4">
              {useBaileys ? (
                <div className="text-center">
                  <div className="w-48 h-48 bg-white mx-auto mb-4 flex items-center justify-center text-slate-900 font-bold border-4 border-white rounded-lg">
                    [QR CODE MOCK]
                  </div>
                  <p className="text-sm text-slate-400">Scan this QR code with your WhatsApp app.</p>
                </div>
              ) : (
                <div className="text-center">
                  <Shield className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <p className="text-sm text-slate-400 mb-4">API Configuration Ready</p>
                  <button className="px-6 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-lg font-bold">
                    Test Connection
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => navigate('/crm')} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl">
              Complete Setup & Go to CRM
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
