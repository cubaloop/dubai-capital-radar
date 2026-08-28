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
  Loader2,
  Euro,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { OutreachCampaign, TriageResponse } from '../types';
import { apiService } from '../services/api';

interface LeadItem {
  index: number;
  name: string;
  phone: string;
  email?: string;
  objective?: string;
  timeline?: string;
  notes?: string;
  sample_message?: string;
  personalized_message?: string;
}

export const CampaignManager: React.FC = () => {
  const [activeCampaignTab, setActiveCampaignTab] = useState<'spain' | 'miami'>('spain');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Leads data
  const [spainLeads, setSpainLeads] = useState<LeadItem[]>([]);
  const [miamiLeads, setMiamiLeads] = useState<LeadItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Selection and previews
  const [selectedLeadPreview, setSelectedLeadPreview] = useState<LeadItem | null>(null);
  
  // Send state
  const [sendingLeadPhone, setSendingLeadPhone] = useState<string | null>(null);
  const [sentLeads, setSentLeads] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLaunchingBatch, setIsLaunchingBatch] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [spainRes, miamiRes] = await Promise.all([
          fetch('/api/campaigns/spain-reactivation/leads').then(r => r.json()).catch(() => null),
          fetch('/api/campaigns/miami-event/leads').then(r => r.json()).catch(() => null)
        ]);
        
        if (spainRes?.leads) {
          setSpainLeads(spainRes.leads);
          setSelectedLeadPreview(spainRes.leads[0]);
        }
        if (miamiRes?.leads) {
          setMiamiLeads(miamiRes.leads);
          if (!spainRes?.leads) setSelectedLeadPreview(miamiRes.leads[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentLeads = activeCampaignTab === 'spain' ? spainLeads : miamiLeads;
  
  const filteredLeads = currentLeads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone.includes(searchTerm) ||
    (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSendSingleLead = async (lead: LeadItem) => {
    try {
      setSendingLeadPhone(lead.phone);
      const msg = lead.personalized_message || lead.sample_message || '';
      const payload: any = {
        to: lead.phone,
        message: msg
      };
      
      // Attach appropriate flyer
      if (activeCampaignTab === 'spain') {
        payload.image_path = '/app/whatsapp-gateway/uploads/dubai_madrid_event.jpg';
      } else if (activeCampaignTab === 'miami') {
        payload.image_path = '/app/whatsapp-gateway/uploads/dubai_miami_event.jpg';
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSentLeads(prev => ({ ...prev, [lead.phone]: true }));
        setStatusMsg(`✅ Invitación a Madrid Expo enviada con éxito a ${lead.name} (${lead.phone})`);
      } else {
        setStatusMsg(`⚠️ Error enviando a ${lead.name}: ${data.error || 'Fallo de entrega'}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setSendingLeadPhone(null);
    }
  };

  const handleLaunchBatchSequence = async () => {
    try {
      setIsLaunchingBatch(true);
      const endpoint = activeCampaignTab === 'spain'
        ? '/api/campaigns/spain-reactivation/launch'
        : '/api/campaigns/miami-event/launch';
      
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setStatusMsg(`🚀 ${data.message || 'Campaña iniciada en segundo plano con pausas de seguridad'}`);
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setIsLaunchingBatch(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white">
          Gestor de Campañas & Outreach WhatsApp
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl">
          Supervisión de secuencias de reactivación, métricas culturales (Euros / m²) y control individual por lead.
        </p>
      </div>

      {/* Campaign Selector Tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setActiveCampaignTab('spain');
            if (spainLeads.length > 0) setSelectedLeadPreview(spainLeads[0]);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold font-mono transition-all ${
            activeCampaignTab === 'spain'
              ? 'bg-gold-500 text-slate-950 shadow-lg shadow-gold-500/20 scale-102'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-gold-500/40'
          }`}
        >
          <span>🇪🇸 Reactivación España ({spainLeads.length} Leads)</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/40 text-[10px] font-mono">EUR (€) & m²</span>
        </button>

        <button
          onClick={() => {
            setActiveCampaignTab('miami');
            if (miamiLeads.length > 0) setSelectedLeadPreview(miamiLeads[0]);
          }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold font-mono transition-all ${
            activeCampaignTab === 'miami'
              ? 'bg-gold-500 text-slate-950 shadow-lg shadow-gold-500/20 scale-102'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-gold-500/40'
          }`}
        >
          <span>🇺🇸 Evento Presencial Miami ({miamiLeads.length} Leads)</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-950/40 text-[10px] font-mono">Flyer Adjunto</span>
        </button>
      </div>

      {statusMsg && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs p-3.5 rounded-xl font-mono text-center shadow-lg animate-fade-in">
          {statusMsg}
        </div>
      )}

      {/* Main Campaign Workstation */}
      <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 border border-gold-500/40 space-y-6">
        {/* Campaign Info Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 font-mono text-[11px] font-bold uppercase">
              {activeCampaignTab === 'spain' ? '🇪🇸 Campaña España Feb Video Ads' : '🇺🇸 Campaña Evento VIP Miami'}
            </div>
            <h2 className="text-xl font-bold text-white font-serif-luxury mt-1">
              {activeCampaignTab === 'spain' 
                ? 'Secuencia Empática de Reactivación Post-Conflicto' 
                : 'Briefing Presencial Hilton Garden Inn Miramar'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {activeCampaignTab === 'spain'
                ? 'Mensajes adaptados en Euros (€), Metros Cuadrados (m²) y resolución empática de la objeción geopolítica.'
                : 'Invitación personalizada al salón VIP de Miramar con flyer gráfico adjunto.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, tel o nota..."
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono w-56"
              />
            </div>

            <button
              onClick={handleLaunchBatchSequence}
              disabled={isLaunchingBatch}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 text-slate-950 font-black px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95 text-xs font-mono uppercase tracking-wider disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLaunchingBatch ? 'Despachando...' : `Despachar a Todos (${filteredLeads.length})`}</span>
            </button>
          </div>
        </div>

        {/* Two Column Workstation: Leads Table + Real-Time WhatsApp Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Leads List with Individual Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Leads Filtrados: {filteredLeads.length} de {currentLeads.length}</span>
              <span className="text-emerald-400 font-bold">● WhatsApp Gateway Conectado</span>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
              {filteredLeads.map((lead) => {
                const isSent = sentLeads[lead.phone];
                const isSendingThis = sendingLeadPhone === lead.phone;
                const previewMsg = lead.personalized_message || lead.sample_message || '';
                const waDirectLink = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(previewMsg)}`;

                return (
                  <div
                    key={lead.index}
                    onClick={() => setSelectedLeadPreview(lead)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      selectedLeadPreview?.phone === lead.phone
                        ? 'bg-gold-500/15 border-gold-500 shadow-md shadow-gold-500/10'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-slate-800 text-gold-400 font-mono font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                        {lead.index}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{lead.name}</span>
                          {isSent && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-800 font-mono">
                              <Check className="w-3 h-3" /> Enviado
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {lead.phone} {lead.email ? `• ${lead.email}` : ''}
                        </div>
                        {lead.notes && (
                          <div className="text-[10px] text-gold-300 font-medium bg-gold-950/40 px-2 py-0.5 rounded border border-gold-800/40 inline-block mt-1">
                            Nota: {lead.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <a
                        href={waDirectLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                        title="Abrir directamente en WhatsApp Web"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendSingleLead(lead);
                        }}
                        disabled={isSendingThis}
                        className={`px-3.5 py-2 rounded-xl font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                          isSent
                            ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-700'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                        }`}
                      >
                        {isSendingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : isSent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Reenviar</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Message Preview in WhatsApp Phone Bubble (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Vista Previa del Mensaje (WhatsApp)</span>
              <span className="text-gold-400">{selectedLeadPreview?.name || 'Selecciona un lead'}</span>
            </div>

            {selectedLeadPreview ? (
              <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-xl relative">
                {/* Contact Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center font-mono">
                    {selectedLeadPreview.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{selectedLeadPreview.name}</h4>
                    <p className="text-[11px] text-emerald-400 font-mono">{selectedLeadPreview.phone}</p>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="space-y-3">
                  <div className="bg-emerald-950/60 border border-emerald-800/60 rounded-2xl rounded-tl-none p-4 text-xs text-slate-200 leading-relaxed space-y-2.5 font-sans whitespace-pre-line shadow-inner">
                    {selectedLeadPreview.personalized_message || selectedLeadPreview.sample_message}
                  </div>

                  <div className="text-right text-[10px] text-slate-500 font-mono">
                    Formato: Euros (€) • Metros Cuadrados (m²) • 0% IRPF
                  </div>
                </div>

                {/* Quick Action Button for Selected Lead */}
                <button
                  onClick={() => handleSendSingleLead(selectedLeadPreview)}
                  disabled={sendingLeadPhone === selectedLeadPreview.phone}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 text-slate-950 font-black py-3 rounded-2xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {sendingLeadPhone === selectedLeadPreview.phone ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando mensaje...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar a {selectedLeadPreview.name.split(' ')[0]}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-slate-950 rounded-3xl p-8 border border-slate-800 text-center text-slate-500 text-xs font-mono">
                Selecciona un lead de la lista para ver su mensaje personalizado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
