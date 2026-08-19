import React, { useState, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Mail, 
  User, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { OutreachCampaign, TriageResponse } from '../types';
import { apiService } from '../services/api';

export const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Triage state
  const [testSender, setTestSender] = useState<string>('Alexander Wright');
  const [testMessage, setTestMessage] = useState<string>(
    'Received your dossier. The 0% tax model looks interesting, but how does the DLD escrow guarantee my capital if the developer has delays?'
  );
  const [isTriaging, setIsTriaging] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<TriageResponse | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.getCampaigns();
        setCampaigns(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const handleTestTriage = async () => {
    try {
      setIsTriaging(true);
      const res = await apiService.classifyTriage(testSender, 'prosp-demo', testMessage);
      setTriageResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTriaging(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white">
          Outreach Automatizado & Triage de Respuestas IA
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          Monitoreo de secuencias de captación institucional y motor de clasificación semántica para respuestas de inversores.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Campaigns Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-luxury font-bold text-lg text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-gold-400" /> Secuencias de Correo Institucional
            </h2>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              {campaigns.length} Enviadas
            </span>
          </div>

          <div className="space-y-4">
            {campaigns.map((camp) => {
              return (
                <div key={camp.id} className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <h3 className="font-bold text-sm text-white">{camp.prospect_name}</h3>
                      <span className="text-xs text-slate-400 font-mono">({camp.prospect_email})</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 uppercase font-mono">
                      Multi-Channel Ready
                    </span>
                  </div>

                  {/* 3 Channel Cards */}
                  <div className="space-y-2">
                    {/* 1. Email */}
                    <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gold-400 font-bold flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> 1. Correo Institucional
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">Asunto: {camp.subject_line}</span>
                      </div>
                      <div className="text-slate-300 font-mono text-[11px] line-clamp-2 whitespace-pre-line bg-slate-950/60 p-2 rounded border border-slate-800">
                        {camp.body_content}
                      </div>
                    </div>

                    {/* 2. LinkedIn InMail */}
                    <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-blue-400 font-bold flex items-center gap-1.5">
                          💼 2. LinkedIn InMail Pitch
                        </span>
                        <a
                          href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(camp.prospect_name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                        >
                          Buscar en LinkedIn ↗
                        </a>
                      </div>
                      <div className="text-slate-300 text-xs bg-slate-950/60 p-2 rounded border border-slate-800 italic">
                        "{camp.linkedin_message || `Hi ${camp.prospect_name.split(' ')[0]}, we prepared a 5-year tax arbitrage model for Dubai Golden Visa...`}"
                      </div>
                    </div>

                    {/* 3. WhatsApp Direct */}
                    <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          📱 3. WhatsApp Direct Outreach
                        </span>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(camp.whatsapp_message || `Hello ${camp.prospect_name}, here is your confidential Dubai dossier: https://dubai-capital-radar.onrender.com/dossier/${camp.dossier_slug}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          Enviar por WhatsApp ↗
                        </a>
                      </div>
                      <div className="text-slate-300 text-xs bg-slate-950/60 p-2 rounded border border-slate-800 italic">
                        "{camp.whatsapp_message || `Hello ${camp.prospect_name}, we structured a Dubai real estate & Golden Visa allocation portfolio for you...`}"
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Enlace Privado: /dossier/{camp.dossier_slug}</span>
                    <span className="text-emerald-400 font-semibold">Estado: Despacho Activo</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: AI Response Triage Sandbox */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-luxury font-bold text-lg text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-gold-400" /> AI Response Triage & Auto-Responder
            </h2>
            <span className="text-xs text-gold-400 font-mono bg-gold-950/60 border border-gold-800/60 px-2 py-0.5 rounded-md">
              Gemini NLP
            </span>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <p className="text-xs text-slate-300">
              Prueba cómo el agente clasifica objeciones (legalidad, escrow, impuestos o solicitud de llamada) y redacta la respuesta adecuada:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nombre del Inversor:</label>
                <input
                  type="text"
                  value={testSender}
                  onChange={(e) => setTestSender(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mensaje o Respuesta Recibida:</label>
                <textarea
                  rows={4}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500 text-xs leading-relaxed"
                />
              </div>

              <button
                onClick={handleTestTriage}
                disabled={isTriaging}
                className="w-full bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-600 hover:to-gold-500 text-slate-950 font-bold py-2.5 rounded-xl transition-all shadow-md shadow-gold-500/20 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isTriaging ? 'Analizando Intención con IA...' : 'Clasificar y Redactar Respuesta'}</span>
              </button>
            </div>

            {/* Triage Output */}
            {triageResult && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Sentimiento Detectado:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-500/20 text-gold-300 border border-gold-500/40 uppercase">
                    {triageResult.sentiment}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Prioridad de Cierre:</span>
                  <span className="text-emerald-400 font-bold font-mono">{triageResult.priority_level}</span>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-mono text-gold-400 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> Respuesta Sugerida para Envío:
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed italic">
                    "{triageResult.suggested_reply}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
