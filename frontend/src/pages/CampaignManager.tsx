import React, { useState, useEffect, useRef } from 'react';
import { CrmCampaign, CrmLead, BatchDispatchStatus } from '../types';
import { apiService } from '../services/api';
import {
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Play,
  Pause,
  Square,
  ExternalLink,
  Loader2,
  Search,
  Filter,
  Plus,
  Upload,
  FileSpreadsheet,
  X,
  Calendar,
  AlertCircle,
  RefreshCw,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

export const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('spain_madrid_expo');
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [selectedLeadPreview, setSelectedLeadPreview] = useState<CrmLead | null>(null);

  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  const [isLoadingLeads, setIsLoadingLeads] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'sent'>('all');

  // Single send feedback
  const [sendingLeadId, setSendingLeadId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Batch Automation State
  const [batchStatus, setBatchStatus] = useState<BatchDispatchStatus | null>(null);
  const [isStartingBatch, setIsStartingBatch] = useState<boolean>(false);
  const [batchDelay, setBatchDelay] = useState<number>(8);
  const batchPollTimer = useRef<any>(null);

  // New Campaign Modal State
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState<boolean>(false);
  const [newCampName, setNewCampName] = useState<string>('');
  const [newCampCategory, setNewCampCategory] = useState<string>('España');
  const [newCampContext, setNewCampContext] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFlyer, setSelectedFlyer] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 1. Fetch campaigns list on mount
  const fetchCampaigns = async () => {
    try {
      setIsLoadingCampaigns(true);
      const res = await apiService.getCrmCampaigns();
      if (res?.campaigns && res.campaigns.length > 0) {
        setCampaigns(res.campaigns);
        // Default to Spain if available or first
        if (!selectedCampaignId) {
          const defaultCamp = res.campaigns.find((c: CrmCampaign) => c.id === 'spain_madrid_expo') || res.campaigns[0];
          setSelectedCampaignId(defaultCamp.id);
        }
      }
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // 2. Fetch leads for selected campaign
  const fetchLeads = async (cid: string) => {
    if (!cid) return;
    try {
      setIsLoadingLeads(true);
      const res = await apiService.getCampaignLeads(cid);
      if (res?.leads) {
        setLeads(res.leads);
        if (res.leads.length > 0) {
          setSelectedLeadPreview(res.leads[0]);
        } else {
          setSelectedLeadPreview(null);
        }
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) {
      fetchLeads(selectedCampaignId);
      // Fetch batch status
      apiService.getBatchStatus(selectedCampaignId).then(setBatchStatus).catch(() => null);
    }
  }, [selectedCampaignId]);

  // 3. Batch polling when running
  useEffect(() => {
    if (batchStatus?.status === 'running') {
      batchPollTimer.current = setInterval(async () => {
        if (!selectedCampaignId) return;
        const s = await apiService.getBatchStatus(selectedCampaignId);
        setBatchStatus(s);
        if (s.status !== 'running') {
          if (batchPollTimer.current) clearInterval(batchPollTimer.current);
          fetchLeads(selectedCampaignId);
          fetchCampaigns();
        }
      }, 2500);
    } else {
      if (batchPollTimer.current) clearInterval(batchPollTimer.current);
    }
    return () => {
      if (batchPollTimer.current) clearInterval(batchPollTimer.current);
    };
  }, [batchStatus?.status, selectedCampaignId]);

  // Single Lead Send Handler
  const handleSendSingleLead = async (lead: CrmLead) => {
    try {
      setSendingLeadId(lead.id);
      const res = await apiService.sendLeadWhatsApp(lead.id);
      if (res?.success) {
        // Update local state immediately
        const nowStr = new Date().toLocaleString();
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, whatsapp_status: 'sent', last_sent_type: 'manual', last_contact_date: nowStr }
              : l
          )
        );
        if (selectedLeadPreview?.id === lead.id) {
          setSelectedLeadPreview({
            ...selectedLeadPreview,
            whatsapp_status: 'sent',
            last_sent_type: 'manual',
            last_contact_date: nowStr
          });
        }
        setStatusMsg(`✅ Mensaje enviado y guardado con éxito para ${lead.name}`);
        fetchCampaigns(); // Update counters
      } else {
        setStatusMsg(`⚠️ Error enviando a ${lead.name}: ${res?.error || 'Fallo de entrega'}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setSendingLeadId(null);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  // Batch Automation Controls
  const handleStartBatch = async () => {
    try {
      setIsStartingBatch(true);
      const res = await apiService.startBatchDispatch(selectedCampaignId, batchDelay);
      if (res?.status) {
        setBatchStatus(res.status);
        setStatusMsg('🚀 Secuencia de envío automático iniciada con persistencia en vivo.');
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setIsStartingBatch(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleControlBatch = async (action: 'pause' | 'resume' | 'stop') => {
    try {
      const res = await apiService.controlBatchDispatch(selectedCampaignId, action);
      if (res?.status) {
        setBatchStatus(res.status);
        if (action === 'stop') {
          fetchLeads(selectedCampaignId);
          fetchCampaigns();
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Upload Excel / CSV New Campaign
  const handleUploadCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Por favor selecciona un archivo Excel (.xlsx) o CSV.');
      return;
    }
    if (!newCampName.trim()) {
      setUploadError('Por favor escribe un nombre o etiqueta para la campaña.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('campaign_name', newCampName.trim());
      formData.append('category', newCampCategory);
      formData.append('campaign_context', newCampContext.trim());
      if (selectedFlyer) {
        formData.append('flyer', selectedFlyer);
      }

      const res = await apiService.uploadExcelCampaign(formData);
      if (res?.success) {
        setIsNewCampaignOpen(false);
        setSelectedFile(null);
        setSelectedFlyer(null);
        setNewCampName('');
        setNewCampContext('');
        setStatusMsg(`🎉 Campaña "${res.campaign.name}" creada con éxito (${res.leads_count} leads).`);
        await fetchCampaigns();
        setSelectedCampaignId(res.campaign.id);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error al procesar el archivo Excel.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchSearch) return false;

    if (statusFilter === 'pending' && l.whatsapp_status === 'sent') return false;
    if (statusFilter === 'sent' && l.whatsapp_status !== 'sent') return false;

    return true;
  });

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white flex items-center gap-3">
            <span>WhatsApp & Campañas</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              Gateway Conectado
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Gestión de grupos de captación, importación directa de Excel, envíos manuales a 1 clic o secuencias automáticas garantizadas.
          </p>
        </div>

        {/* Button: Add New Campaign via Excel */}
        <button
          onClick={() => setIsNewCampaignOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-600 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-lg shadow-gold-500/20 active:scale-95 transition-all text-xs font-mono uppercase tracking-wider self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Campaña (Excel / CSV)</span>
        </button>
      </div>

      {/* Subcategory: Campaigns Selector Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {campaigns.map((camp) => {
          const isSelected = camp.id === selectedCampaignId;
          return (
            <button
              key={camp.id}
              onClick={() => setSelectedCampaignId(camp.id)}
              className={`flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-mono transition-all ${
                isSelected
                  ? 'bg-gold-500 text-slate-950 font-black shadow-lg shadow-gold-500/20 scale-102'
                  : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-gold-500/40'
              }`}
            >
              <div className="text-left">
                <div className="font-bold">{camp.name}</div>
                <div className={`text-[10px] ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                  {camp.sent_leads} / {camp.total_leads} enviados ({camp.pending_leads} pendientes)
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Toast */}
      {statusMsg && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs p-3.5 rounded-2xl font-mono text-center shadow-lg animate-fade-in">
          {statusMsg}
        </div>
      )}

      {/* Batch Automation Control Panel */}
      <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase font-bold text-gold-400">Control de Envío Automático</span>
              {batchStatus?.status === 'running' && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono animate-pulse">
                  ● Enviando en Segundo Plano
                </span>
              )}
              {batchStatus?.status === 'paused' && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono">
                  ❚❚ En Pausa
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Despacha a todos los leads pendientes de forma secuencial con pausas de seguridad anti-baneo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Delay selector */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
              <span>Pausa:</span>
              <select
                value={batchDelay}
                onChange={(e) => setBatchDelay(Number(e.target.value))}
                disabled={batchStatus?.status === 'running'}
                className="bg-transparent text-white font-bold focus:outline-none"
              >
                <option value={5} className="bg-slate-900 text-white">5s (Rápido / Test)</option>
                <option value={8} className="bg-slate-900 text-white">8s (Estándar)</option>
                <option value={20} className="bg-slate-900 text-white">20s (Seguro)</option>
                <option value={45} className="bg-slate-900 text-white">45s (Anti-Ban)</option>
              </select>
            </div>

            {/* Batch Action Buttons */}
            {batchStatus?.status === 'running' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleControlBatch('pause')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar</span>
                </button>
                <button
                  onClick={() => handleControlBatch('stop')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Detener</span>
                </button>
              </div>
            ) : batchStatus?.status === 'paused' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleControlBatch('resume')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Reanudar</span>
                </button>
                <button
                  onClick={() => handleControlBatch('stop')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Detener</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartBatch}
                disabled={isStartingBatch || leads.length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isStartingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Iniciando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Iniciar Envío Automático</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Live Progress Bar if active */}
        {batchStatus && batchStatus.total > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">
                Progreso:{' '}
                <b className="text-emerald-400">
                  {batchStatus.sent} / {batchStatus.total}
                </b>{' '}
                ({Math.round((batchStatus.sent / batchStatus.total) * 100)}%)
              </span>
              {batchStatus.current_lead_name && (
                <span className="text-gold-400 truncate max-w-[280px]">
                  Enviando ahora: {batchStatus.current_lead_name} ({batchStatus.current_lead_phone})
                </span>
              )}
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${Math.round((batchStatus.sent / batchStatus.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Campaign Workstation Grid */}
      <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 border border-gold-500/40 space-y-6">
        {/* Campaign Info & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 font-mono text-[11px] font-bold uppercase">
              {selectedCampaign?.category || 'Campaña'}
            </div>
            <h2 className="text-xl font-bold text-white font-serif-luxury mt-1">
              {selectedCampaign?.name || 'Selecciona una campaña'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {selectedCampaign?.description || 'Lista de prospectos para envío y reactivación.'}
            </p>
          </div>

          {/* Search and Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en campaña..."
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 font-mono w-52"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'all' ? 'bg-gold-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({leads.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'pending' ? 'bg-gold-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendientes ({leads.filter((l) => l.whatsapp_status !== 'sent').length})
              </button>
              <button
                onClick={() => setStatusFilter('sent')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'sent' ? 'bg-gold-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Enviados ({leads.filter((l) => l.whatsapp_status === 'sent').length})
              </button>
            </div>

            <button
              onClick={() => selectedCampaignId && fetchLeads(selectedCampaignId)}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              title="Recargar leads"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLeads ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2-Column Workstation: Leads Cards List + Real-time Phone Bubble Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Leads Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Leads ({filteredLeads.length})</span>
              <span className="text-emerald-400 font-bold">● Persistencia Online 100% Activa</span>
            </div>

            <div className="max-h-[580px] overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
              {filteredLeads.map((lead, idx) => {
                const isSent = lead.whatsapp_status === 'sent';
                const isSendingThis = sendingLeadId === lead.id;
                const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
                const waDirectLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lead.personalized_message || '')}`;

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadPreview(lead)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      selectedLeadPreview?.id === lead.id
                        ? 'bg-gold-500/15 border-gold-500 shadow-md shadow-gold-500/10'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-slate-800 text-gold-400 font-mono font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="text-sm">{lead.name}</span>
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800 font-mono">
                              <CheckCircle2 className="w-3 h-3" /> Enviado ({lead.last_sent_type || 'manual'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                              Pendiente
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono">
                          {lead.phone} {lead.email ? `• ${lead.email}` : ''}
                        </div>

                        {lead.last_contact_date && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Fecha de envío: {lead.last_contact_date}
                          </div>
                        )}

                        {lead.notes && (
                          <div className="text-[10px] text-gold-300 font-medium bg-gold-950/40 px-2 py-0.5 rounded border border-gold-800/40 inline-block">
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
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        title="Abrir en WhatsApp Web"
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
                            <CheckCircle2 className="w-3.5 h-3.5" />
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

              {filteredLeads.length === 0 && (
                <div className="py-16 text-center text-slate-500 text-xs font-mono">
                  No hay leads que coincidan con los filtros.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Message Preview in WhatsApp Phone Bubble (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Vista Previa del Mensaje</span>
              <span className="text-gold-400 font-bold">{selectedLeadPreview?.name || 'Selecciona un lead'}</span>
            </div>

            {selectedLeadPreview ? (
              <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800 space-y-4 shadow-2xl relative">
                {/* Contact Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center font-mono text-base">
                    {selectedLeadPreview.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{selectedLeadPreview.name}</h4>
                    <p className="text-[11px] text-emerald-400 font-mono">{selectedLeadPreview.phone}</p>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="space-y-3">
                  <div className="bg-emerald-950/70 border border-emerald-800/70 rounded-2xl rounded-tl-none p-4 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line shadow-inner max-h-72 overflow-y-auto custom-scrollbar">
                    {selectedLeadPreview.personalized_message}
                  </div>

                  {selectedLeadPreview.last_contact_date && (
                    <div className="text-right text-[10px] text-emerald-400 font-mono">
                      ✅ Mensaje enviado: {selectedLeadPreview.last_contact_date}
                    </div>
                  )}
                </div>

                {/* 1-Click Send Button */}
                <button
                  onClick={() => handleSendSingleLead(selectedLeadPreview)}
                  disabled={sendingLeadId === selectedLeadPreview.id}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
                >
                  {sendingLeadId === selectedLeadPreview.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Despachando...</span>
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
              <div className="bg-slate-950 rounded-3xl p-12 border border-slate-800 text-center text-slate-500 text-xs font-mono">
                Selecciona un lead de la lista para ver su mensaje personalizado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Nueva Campaña (Cargar Excel / CSV) */}
      {isNewCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 relative shadow-2xl">
            <button
              onClick={() => setIsNewCampaignOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-serif-luxury">Nueva Campaña de Leads</h3>
                <p className="text-xs text-slate-400">Sube un Excel (.xlsx) o CSV con nombres, teléfonos y notas.</p>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-600 text-rose-200 text-xs font-mono">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadCampaign} className="space-y-4 text-xs font-sans">
              {/* File Input */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-mono block">Archivo Excel / CSV de Leads *</label>
                <div className="border-2 border-dashed border-slate-700 hover:border-gold-500/60 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-950">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="excel-file-upload"
                  />
                  <label htmlFor="excel-file-upload" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-gold-400 mx-auto" />
                    <div className="text-white font-bold">
                      {selectedFile ? selectedFile.name : 'Haz clic para seleccionar o arrastra tu archivo'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Soporta .xlsx, .xls y .csv (Meta Ads, Google Ads o listas propias)
                    </div>
                  </label>
                </div>
              </div>

              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-mono block">Nombre / Etiqueta de Campaña *</label>
                <input
                  type="text"
                  required
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  placeholder="Ej: Inversores Valencia Septiembre"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-xs"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-mono block">Categoría de Mercado</label>
                <select
                  value={newCampCategory}
                  onChange={(e) => setNewCampCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-500 text-xs font-mono"
                >
                  <option value="España">España</option>
                  <option value="LatAm">LatAm (México, Argentina, etc.)</option>
                  <option value="USA">USA / Miami</option>
                  <option value="Crypto">Inversionistas Crypto</option>
                  <option value="General">General</option>
                </select>
              </div>

              {/* Offer Context / AI Prompt */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-mono block">
                  Contexto de la Oferta / Mensaje IA (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={newCampContext}
                  onChange={(e) => setNewCampContext(e.target.value)}
                  placeholder="Ej: Invitación a evento presencial en Valencia, asesoría gratuita 2 días, descuentos del 15% al 20%, Golden Visa gratis..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-xs leading-relaxed"
                />
              </div>

              {/* Optional Flyer Image */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-mono block">Imagen / Flyer Adjunto (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFlyer(e.target.files?.[0] || null)}
                  className="w-full text-slate-400 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-600 text-slate-950 font-black font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-gold-500/20 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando Leads...</span>
                    </>
                  ) : (
                    <span>Crear Campaña</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
