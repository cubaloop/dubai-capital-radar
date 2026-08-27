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
  AlertTriangle, 
  Image as ImageIcon, 
  MapPin, 
  Calendar, 
  Phone, 
  Play, 
  Check,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { OutreachCampaign, TriageResponse } from '../types';
import { apiService } from '../services/api';

interface MiamiLead {
  index: number;
  name: string;
  phone: string;
  email: string;
  sample_message: string;
}

export const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Miami Event Campaign State
  const [miamiLeads, setMiamiLeads] = useState<MiamiLead[]>([]);
  const [isLaunchingMiami, setIsLaunchingMiami] = useState<boolean>(false);
  const [miamiStatusMsg, setMiamiStatusMsg] = useState<string | null>(null);
  const [selectedLeadPreview, setSelectedLeadPreview] = useState<MiamiLead | null>(null);
  
  // Per-lead send state
  const [sendingLeadPhone, setSendingLeadPhone] = useState<string | null>(null);
  const [sentLeads, setSentLeads] = useState<Record<string, boolean>>({});

  // Triage state
  const [testSender, setTestSender] = useState<string>('Alexander Wright');
  const [testMessage, setTestMessage] = useState<string>(
    'Received your dossier. The 0% tax model looks interesting, but how does the DLD escrow guarantee my capital if the developer has delays?'
  );
  const [isTriaging, setIsTriaging] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<TriageResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [campsData, miamiData] = await Promise.all([
          apiService.getCampaigns(),
          fetch('/api/campaigns/miami-event/leads').then(r => r.json()).catch(() => null)
        ]);
        setCampaigns(campsData);
        if (miamiData?.leads) {
          setMiamiLeads(miamiData.leads);
          setSelectedLeadPreview(miamiData.leads[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLaunchMiamiCampaign = async () => {
    try {
      setIsLaunchingMiami(true);
      const res = await fetch('/api/campaigns/miami-event/launch', { method: 'POST' });
      const data = await res.json();
      setMiamiStatusMsg(`✅ ¡${data.message || 'Campaña iniciada para los 13 leads con imagen adjunta'}!`);
      // Mark all as sent in local state
      const updated: Record<string, boolean> = {};
      miamiLeads.forEach(l => updated[l.phone] = true);
      setSentLeads(prev => ({ ...prev, ...updated }));
    } catch (err: any) {
      setMiamiStatusMsg(`❌ Error al iniciar campaña: ${err.message}`);
    } finally {
      setIsLaunchingMiami(false);
    }
  };

  const handleSendSingleLead = async (lead: MiamiLead) => {
    try {
      setSendingLeadPhone(lead.phone);
      const payload = {
        to: lead.phone,
        message: lead.sample_message,
        image_path: '/app/whatsapp-gateway/uploads/dubai_miami_event.jpg'
      };
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSentLeads(prev => ({ ...prev, [lead.phone]: true }));
        setMiamiStatusMsg(`✅ Mensaje + Flyer enviado con éxito a ${lead.name} (${lead.phone})`);
      } else {
        setMiamiStatusMsg(`⚠️ Error enviando a ${lead.name}: ${data.error || 'Fallo de entrega'}`);
      }
    } catch (err: any) {
      setMiamiStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setSendingLeadPhone(null);
    }
  };

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
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white">
          Outreach Automatizado & Triage de Respuestas IA
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          Monitoreo de secuencias de captación institucional, campañas de eventos presenciales y clasificación semántica de respuestas.
        </p>
      </div>

      {/* MIAMI VIP EVENT DEDICATED CAMPAIGN CARD */}
      <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 border border-gold-500/40 relative overflow-hidden space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 font-mono text-xs uppercase tracking-wider font-bold">
              <Calendar className="w-3.5 h-3.5" /> Evento Presencial VIP • Miami
            </div>
            <h2 className="text-2xl font-serif-luxury font-bold text-white">
              Inversiones Inmobiliarias en Dubai — Hilton Garden Miramar
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5 text-gold-400 font-semibold font-mono">
                <Clock className="w-4 h-4" /> Domingo 29 de Agosto (10:00 AM - 8:00 PM)
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400" /> Hilton Garden Inn, Miramar, Florida
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                <ImageIcon className="w-4 h-4" /> Flyer Adjunto Incluido
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleLaunchMiamiCampaign}
              disabled={isLaunchingMiami}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-emerald-500 text-slate-950 font-black px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95 text-xs font-mono uppercase tracking-wider disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isLaunchingMiami ? 'Despachando Todos...' : `Enviar a los ${miamiLeads.length || 13} Leads en Secuencia`}</span>
            </button>
          </div>
        </div>

        {miamiStatusMsg && (
          <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs p-3.5 rounded-xl font-mono text-center shadow-lg animate-fade-in">
            {miamiStatusMsg}
          </div>
        )}

        {/* Lead Table + Message Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-800">
          {/* Leads List with Individual Send Action (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Lista de Leads ({miamiLeads.length}) • Control Individual y Directo</span>
              <span className="text-gold-400">Canal: WhatsApp Gateway</span>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {miamiLeads.map((lead) => {
                const isSent = sentLeads[lead.phone];
                const isSendingThis = sendingLeadPhone === lead.phone;
                const waDirectLink = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(lead.sample_message)}`;

                return (
                  <div
                    key={lead.index}
                    onClick={() => setSelectedLeadPreview(lead)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                      selectedLeadPreview?.phone === lead.phone
                        ? 'bg-gold-500/10 border-gold-500/60 shadow-md shadow-gold-500/10'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-gold-400 font-mono font-bold flex items-center justify-center text-[10px]">
                        {lead.index}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{lead.name}</span>
                          {isSent && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800 font-mono">
                              <Check className="w-3 h-3" /> Enviado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{lead.phone}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Individual Send Button */}
                      <button
                        onClick={() => handleSendSingleLead(lead)}
                        disabled={isSendingThis}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSent
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                            : 'bg-gold-500 hover:bg-gold-400 text-slate-950 shadow-md shadow-gold-500/20'
                        } disabled:opacity-50`}
                      >
                        {isSendingThis ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : isSent ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Reenviar</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>Enviar</span>
                          </>
                        )}
                      </button>

                      {/* Direct WA Web / App Link Fallback */}
                      <a
                        href={waDirectLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-400 border border-slate-700 transition-colors"
                        title="Abrir Chat Directo en WhatsApp Web/App"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Message Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Vista Previa del Mensaje</span>
              <span className="text-emerald-400 font-bold">WhatsApp Oficial</span>
            </div>

            {selectedLeadPreview ? (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-400">Destinatario:</span>
                  <span className="font-bold text-gold-300 font-mono">{selectedLeadPreview.name} ({selectedLeadPreview.phone})</span>
                </div>

                <div className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-800/40 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                  {selectedLeadPreview.sample_message}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <ImageIcon className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Imagen adjunta: <strong>Flyer Hilton Garden Miramar</strong></span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => handleSendSingleLead(selectedLeadPreview)}
                    disabled={sendingLeadPhone === selectedLeadPreview.phone}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar a {selectedLeadPreview.name}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                Selecciona un lead para ver la personalización
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column View: Standard Radar Sequences + AI Triage */}
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
                      {camp.status}
                    </span>
                  </div>

                  <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800/60 space-y-2 text-xs">
                    <div className="font-semibold text-gold-300">Asunto: {camp.subject_line}</div>
                    <p className="text-slate-300 italic">"{camp.body_content.slice(0, 150)}..."</p>
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
