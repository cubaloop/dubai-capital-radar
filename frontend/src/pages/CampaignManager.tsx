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
  Image as ImageIcon,
  Edit3,
  Save,
  Smartphone
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

  // AI Prompt Customization State
  const [campaignAiPrompt, setCampaignAiPrompt] = useState<string>('');
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState<boolean>(false);
  const [isPromptPanelOpen, setIsPromptPanelOpen] = useState<boolean>(true);
  const [isAiConnected, setIsAiConnected] = useState<boolean>(true);

  // Individual Lead Message Inline Editing
  const [isEditingLeadMsg, setIsEditingLeadMsg] = useState<boolean>(false);
  const [editedLeadMsgText, setEditedLeadMsgText] = useState<string>('');
  const [isSavingLeadMsg, setIsSavingLeadMsg] = useState<boolean>(false);

  // Send Test Message to My Personal WhatsApp
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>(
    () => localStorage.getItem('dcr_test_phone') || '+971508379080'
  );
  const [isEditingTestPhone, setIsEditingTestPhone] = useState<boolean>(false);
  const [isSendingTestMsg, setIsSendingTestMsg] = useState<boolean>(false);

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
        if (res.gemini_ai_connected !== undefined) {
          setIsAiConnected(res.gemini_ai_connected);
        }
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

  // Sync AI prompt when selected campaign changes
  useEffect(() => {
    const cur = campaigns.find((c) => c.id === selectedCampaignId);
    if (cur) {
      setCampaignAiPrompt(cur.ai_prompt_instructions || '');
    }
  }, [selectedCampaignId, campaigns]);

  // Sync edited message text when selected lead changes
  useEffect(() => {
    if (selectedLeadPreview) {
      setEditedLeadMsgText(selectedLeadPreview.personalized_message || '');
      setIsEditingLeadMsg(false);
    }
  }, [selectedLeadPreview?.id]);

  const PROMPT_PRESETS = [
    {
      label: '🏨 Evento Novotel Madrid',
      text: 'Recordar su interés previo y anunciar que tenemos el evento presencial exclusivo en Novotel Madrid Center los días 9 y 10 de Septiembre. Pedir confirmación para lista VIP.'
    },
    {
      label: '📱 Ofertas desde 50K (Zoom)',
      text: 'Informar que tenemos nuevas ofertas para entrar al mercado inmobiliario de Dubai a partir de 50K. Pedir que me escriba qué día y hora le viene bien esta semana para hacerle una breve presentación online.'
    },
    {
      label: '📈 Revalorización / Flipping',
      text: 'Destacar lanzamientos en preventa (off-plan) con alta plusvalía estimada a 24 meses, planes de pago directos desde 1% mensual sin intereses bancarios y asesoría 1 a 1 sin coste.'
    },
    {
      label: '🛂 Golden Visa & 0% Impuestos',
      text: 'Mencionar la ventaja del 0% de impuestos sobre rentas y plusvalías en Dubai, y tramitación gratuita de la Golden Visa de 10 años para él y su familia.'
    }
  ];

  // Handler: Update Campaign AI Prompt & Regenerate pending leads
  const handleUpdateAiPrompt = async () => {
    if (!selectedCampaignId) return;
    try {
      setIsUpdatingPrompt(true);
      const res = await apiService.updateCampaignAiPrompt(selectedCampaignId, campaignAiPrompt, true);
      if (res?.success) {
        if (res.gemini_ai_connected !== undefined) {
          setIsAiConnected(res.gemini_ai_connected);
        }
        if (res.leads) {
          setLeads(res.leads);
          if (selectedLeadPreview) {
            const updatedCurLead = res.leads.find((l: CrmLead) => l.id === selectedLeadPreview.id);
            if (updatedCurLead) {
              setSelectedLeadPreview(updatedCurLead);
              setEditedLeadMsgText(updatedCurLead.personalized_message || '');
            }
          }
        }
        if (res.campaign) {
          setCampaigns((prev) => prev.map((c) => (c.id === res.campaign.id ? { ...c, ...res.campaign } : c)));
        }
        if (res.ai_used) {
          setStatusMsg(`✨ ¡IA Gemini 3.6 Flash activada! Se redactaron ${res.updated_count} mensajes hiper-personalizados para cada cliente.`);
        } else {
          setStatusMsg(`⚡ ¡Instrucciones aplicadas! Se regeneraron ${res.updated_count} mensajes de leads.`);
        }
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error actualizando prompt: ${err.message}`);
    } finally {
      setIsUpdatingPrompt(false);
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  // Handler: Save Individual Lead Custom Message
  const handleSaveIndividualMessage = async () => {
    if (!selectedLeadPreview) return;
    try {
      setIsSavingLeadMsg(true);
      const res = await apiService.updateLeadCustomMessage(selectedLeadPreview.id, editedLeadMsgText);
      if (res?.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === selectedLeadPreview.id ? { ...l, personalized_message: editedLeadMsgText } : l))
        );
        setSelectedLeadPreview((prev) => (prev ? { ...prev, personalized_message: editedLeadMsgText } : null));
        setIsEditingLeadMsg(false);
        setStatusMsg(`✏️ Mensaje personalizado guardado para ${selectedLeadPreview.name}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error guardando mensaje: ${err.message}`);
    } finally {
      setIsSavingLeadMsg(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

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

  // Send Test Message to My Personal WhatsApp Handler
  const handleSendTestToMyPhone = async () => {
    if (!selectedLeadPreview) return;
    try {
      setIsSendingTestMsg(true);
      const msgToSend = `🧪 *[PRUEBA DE CAMPAÑA - Lead: ${selectedLeadPreview.name}]*\n\n${selectedLeadPreview.personalized_message || ''}`;
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhoneNumber,
          message: msgToSend
        })
      });
      const data = await res.json();
      if (data?.success) {
        setStatusMsg(`✅ ¡Mensaje de prueba de "${selectedLeadPreview.name}" enviado con éxito a tu WhatsApp (${testPhoneNumber})!`);
      } else {
        setStatusMsg(`⚠️ Error al enviar prueba: ${data?.error || 'Fallo de entrega'}`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setIsSendingTestMsg(false);
      setTimeout(() => setStatusMsg(null), 6000);
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
          <h1 className="text-xl sm:text-3xl font-serif-luxury font-bold text-slate-900 flex items-center gap-2.5 flex-wrap">
            <span>WhatsApp & Campañas</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold">
              Gateway Conectado
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Gestión de grupos de captación, importación directa de Excel, envíos manuales a 1 clic o secuencias automáticas garantizadas.
          </p>
        </div>

        {/* Button: Add New Campaign via Excel */}
        <button
          onClick={() => setIsNewCampaignOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-400 hover:to-gold-400 text-slate-950 font-black px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-lg shadow-gold-500/25 active:scale-95 transition-all text-xs font-mono uppercase tracking-wider self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Campaña (Excel / CSV)</span>
        </button>
      </div>

      {/* Subcategory: Campaigns Selector Bar */}
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {campaigns.map((camp) => {
          const isSelected = camp.id === selectedCampaignId;
          return (
            <button
              key={camp.id}
              onClick={() => setSelectedCampaignId(camp.id)}
              className={`flex-shrink-0 flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs font-mono transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500 to-gold-500 text-slate-950 font-black shadow-lg shadow-gold-500/25 scale-[1.01]'
                  : 'card-3d text-slate-700 hover:border-gold-400 hover:text-slate-900'
              }`}
            >
              <div className="text-left">
                <div className="font-bold">{camp.name}</div>
                <div className={`text-[10px] ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                  {camp.sent_leads} / {camp.total_leads} enviados ({camp.pending_leads} pendientes)
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Toast */}
      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3.5 rounded-2xl font-mono text-center shadow-md animate-fade-in">
          {statusMsg}
        </div>
      )}

      {/* Batch Automation Control Panel - 3D Light Blue Card */}
      <div className="card-3d-blue rounded-3xl p-4 sm:p-6 border border-sky-200/90 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase font-bold text-sky-800">Control de Envío Automático</span>
              {batchStatus?.status === 'running' && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono animate-pulse">
                  ● Enviando en Segundo Plano
                </span>
              )}
              {batchStatus?.status === 'paused' && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-mono">
                  ❚❚ En Pausa
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Despacha a todos los leads pendientes de forma secuencial con pausas de seguridad anti-baneo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Delay selector */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-300 shadow-inner">
              <span>Pausa:</span>
              <select
                value={batchDelay}
                onChange={(e) => setBatchDelay(Number(e.target.value))}
                disabled={batchStatus?.status === 'running'}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value={5}>5s (Rápido / Test)</option>
                <option value={8}>8s (Estándar)</option>
                <option value={20}>20s (Seguro)</option>
                <option value={45}>45s (Anti-Ban)</option>
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

      {/* Main Campaign Workstation Grid - Light Blue Panel */}
      <div className="card-3d-blue rounded-3xl p-4 sm:p-7 border border-sky-200/90 shadow-xl space-y-6">
        {/* Campaign Info & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-sky-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300/80 font-mono text-[11px] font-bold uppercase">
              {selectedCampaign?.category || 'Campaña'}
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 font-serif-luxury mt-1.5 leading-tight">
              {selectedCampaign?.name || 'Selecciona una campaña'}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {selectedCampaign?.description || 'Lista de prospectos para envío y reactivación.'}
            </p>
          </div>

          {/* Search and Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en campaña..."
                className="bg-white border border-sky-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500 font-mono w-full sm:w-52 shadow-inner"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-sky-100/70 p-1 rounded-xl border border-sky-200 text-xs font-mono">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'all' ? 'bg-gold-500 text-slate-950 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({leads.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'pending' ? 'bg-gold-500 text-slate-950 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendientes ({leads.filter((l) => l.whatsapp_status !== 'sent').length})
              </button>
              <button
                onClick={() => setStatusFilter('sent')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'sent' ? 'bg-gold-500 text-slate-950 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Enviados ({leads.filter((l) => l.whatsapp_status === 'sent').length})
              </button>
            </div>

            <button
              onClick={() => selectedCampaignId && fetchLeads(selectedCampaignId)}
              className="p-2 rounded-xl bg-white border border-sky-200 text-slate-600 hover:text-slate-900 shadow-sm"
              title="Recargar leads"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLeads ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* AI Bot Instructions Card for this Campaign - Light Blue Panel */}
        <div className="card-3d rounded-3xl p-4 sm:p-6 border border-sky-300 shadow-md space-y-4 relative overflow-hidden bg-gradient-to-br from-sky-100/90 via-white to-sky-50/70">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-700 flex items-center justify-center font-bold text-lg shadow-inner">
                <Sparkles className="w-5 h-5 text-sky-600 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 font-serif-luxury">
                    Instrucciones del Bot de IA para esta Campaña
                  </h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-mono font-bold">
                    {selectedCampaign?.name || 'Campaña Activa'}
                  </span>
                  {isAiConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-mono text-[10px] font-bold shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Gemini 3.6 Flash Conectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-mono text-[10px] font-bold shadow-sm" title="Falta GEMINI_API_KEY en variables de entorno">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Modo Plantilla Local (Sin API Key)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Escribe en lenguaje natural qué quieres que diga el bot (ofertas, eventos, fechas, importes mínimos o llamadas a la acción). La IA combinará estas directivas con los datos individuales del Excel.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsPromptPanelOpen(!isPromptPanelOpen)}
              className="text-xs font-mono text-sky-800 hover:text-sky-900 flex items-center gap-1 self-end sm:self-auto px-3 py-1.5 rounded-xl bg-white border border-sky-300 shadow-sm transition"
            >
              {isPromptPanelOpen ? 'Ocultar Panel ▲' : 'Configurar Bot ▼'}
            </button>
          </div>

          {isPromptPanelOpen && (
            <div className="space-y-4 pt-2 border-t border-sky-200 animate-fade-in">
              {/* Quick Preset Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-500 block">Plantillas Rápidas (Haz clic para insertar):</span>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCampaignAiPrompt(preset.text)}
                      className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:text-sky-900 hover:bg-sky-50 border border-sky-200 hover:border-sky-400 shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={campaignAiPrompt}
                  onChange={(e) => setCampaignAiPrompt(e.target.value)}
                  placeholder="Ej: Quiero que además del contexto del excel les menciones que tenemos nuevas ofertas a partir de 50K en el evento X del hotel Y los días A y B, y que me confirmen asistencia..."
                  className="w-full bg-white border border-sky-300 focus:border-sky-500 rounded-2xl p-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none leading-relaxed custom-scrollbar transition font-sans shadow-inner"
                />
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-500 font-mono">
                  ℹ️ Los primeros 14 leads enviados de España quedan protegidos intactos; se regeneran los {leads.filter((l) => l.whatsapp_status !== 'sent').length} leads pendientes.
                </span>

                <button
                  type="button"
                  onClick={handleUpdateAiPrompt}
                  disabled={isUpdatingPrompt}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-400 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-lg shadow-gold-500/20 active:scale-95 transition-all text-xs font-mono uppercase tracking-wider disabled:opacity-50 shrink-0"
                >
                  {isUpdatingPrompt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Regenerando Mensajes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Aplicar y Regenerar Mensajes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
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
                    className={`p-3.5 sm:p-4 rounded-2xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      selectedLeadPreview?.id === lead.id
                        ? 'bg-sky-100/90 border-2 border-sky-500 shadow-md shadow-sky-500/15'
                        : 'bg-white card-3d hover:border-sky-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                          <span className="text-sm truncate">{lead.name}</span>
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 font-mono">
                              <CheckCircle2 className="w-3 h-3" /> Enviado ({lead.last_sent_type || 'manual'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-mono">
                              Pendiente
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {lead.phone} {lead.email ? `• ${lead.email}` : ''}
                        </div>

                        {lead.last_contact_date && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Fecha de envío: {lead.last_contact_date}
                          </div>
                        )}

                        {lead.notes && (
                          <div className="text-[10px] text-amber-900 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block truncate max-w-full">
                            Nota: {lead.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                      <a
                        href={waDirectLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 transition"
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
                        className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
                          isSent
                            ? 'bg-slate-100 hover:bg-slate-200 text-emerald-800 border border-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
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
                <div className="py-16 text-center text-slate-400 text-xs font-mono">
                  No hay leads que coincidan con los filtros.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Message Preview in WhatsApp Phone Bubble (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Vista Previa del Mensaje</span>
              <span className="text-gold-700 font-bold truncate max-w-[180px]">{selectedLeadPreview?.name || 'Selecciona un lead'}</span>
            </div>

            {selectedLeadPreview ? (
              <div className="card-3d-blue rounded-3xl p-4 sm:p-5 border border-sky-200/90 space-y-4 shadow-xl relative">
                {/* Contact Header with Edit Action */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-sky-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center font-mono text-base shadow-sm">
                      {selectedLeadPreview.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{selectedLeadPreview.name}</h4>
                      <p className="text-[11px] text-emerald-700 font-mono font-medium">{selectedLeadPreview.phone}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditingLeadMsg) {
                        setEditedLeadMsgText(selectedLeadPreview.personalized_message || '');
                      }
                      setIsEditingLeadMsg(!isEditingLeadMsg);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-sky-200 hover:border-sky-400 text-slate-700 hover:text-sky-900 text-[11px] font-mono transition shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingLeadMsg ? 'Cancelar' : 'Editar Texto'}</span>
                  </button>
                </div>

                {/* WhatsApp Chat Bubble or Inline Editor */}
                <div className="space-y-3">
                  {isEditingLeadMsg ? (
                    <div className="space-y-2.5 animate-fade-in">
                      <div className="text-[11px] font-mono text-sky-800 font-bold flex items-center gap-1">
                        <span>✏️ Editando mensaje para {selectedLeadPreview.name.split(' ')[0]}:</span>
                      </div>
                      <textarea
                        rows={8}
                        value={editedLeadMsgText}
                        onChange={(e) => setEditedLeadMsgText(e.target.value)}
                        className="w-full bg-white border border-sky-300 rounded-2xl p-3.5 text-xs text-slate-900 leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-sky-500 custom-scrollbar shadow-inner"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingLeadMsg(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-100 text-xs font-mono border border-sky-200"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveIndividualMessage}
                          disabled={isSavingLeadMsg}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow active:scale-95 disabled:opacity-50"
                        >
                          {isSavingLeadMsg ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Guardar Mensaje</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#e2edfa] border border-sky-200 rounded-2xl p-3.5 space-y-2">
                      <div className="bg-white border border-sky-200/80 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line shadow-sm max-h-72 overflow-y-auto custom-scrollbar">
                        {selectedLeadPreview.personalized_message}
                      </div>
                    </div>
                  )}

                  {selectedLeadPreview.last_contact_date && (
                    <div className="text-right text-[10px] text-emerald-700 font-mono font-medium">
                      ✅ Mensaje enviado: {selectedLeadPreview.last_contact_date}
                    </div>
                  )}
                </div>

                {/* Action Buttons: Real Send + Test to My WhatsApp */}
                <div className="space-y-2.5 pt-1">
                  {/* 1-Click Send Button to Client */}
                  <button
                    onClick={() => handleSendSingleLead(selectedLeadPreview)}
                    disabled={sendingLeadId === selectedLeadPreview.id}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {sendingLeadId === selectedLeadPreview.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Despachando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar a {selectedLeadPreview.name.split(' ')[0]} ({selectedLeadPreview.phone})</span>
                      </>
                    )}
                  </button>

                  {/* Send Test to My Personal WhatsApp */}
                  <div className="p-3 bg-sky-100/70 border border-sky-200/90 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-700">
                      <span className="font-bold flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5 text-sky-800" />
                        Probar en mi WhatsApp:
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingTestPhone(!isEditingTestPhone)}
                        className="text-sky-800 hover:underline flex items-center gap-1 font-bold"
                      >
                        <Edit3 className="w-3 h-3" />
                        {testPhoneNumber}
                      </button>
                    </div>

                    {isEditingTestPhone && (
                      <div className="flex gap-2 animate-fade-in">
                        <input
                          type="text"
                          value={testPhoneNumber}
                          onChange={(e) => {
                            setTestPhoneNumber(e.target.value);
                            localStorage.setItem('dcr_test_phone', e.target.value);
                          }}
                          placeholder="+971508379080"
                          className="flex-1 bg-white border border-sky-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono shadow-inner focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setIsEditingTestPhone(false)}
                          className="px-3 py-1.5 rounded-xl bg-sky-700 text-white font-mono text-xs font-bold shadow-sm"
                        >
                          Listo
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSendTestToMyPhone}
                      disabled={isSendingTestMsg}
                      className="w-full bg-white hover:bg-sky-50 text-sky-900 border border-sky-300 font-bold py-2.5 rounded-xl text-xs font-mono flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {isSendingTestMsg ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-700" />
                          <span>Enviando prueba a tu WhatsApp...</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>🧪 Enviar prueba de este mensaje a mi móvil</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-3d rounded-3xl p-8 text-center text-slate-400 text-xs font-mono bg-white">
                Selecciona un lead de la lista para ver su mensaje personalizado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Nueva Campaña (Cargar Excel / CSV) */}
      {isNewCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="card-3d bg-white border border-slate-200/90 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 relative shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewCampaignOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-inner">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-serif-luxury">Nueva Campaña de Leads</h3>
                <p className="text-xs text-slate-500">Sube un Excel (.xlsx) o CSV con nombres, teléfonos y notas.</p>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-mono">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadCampaign} className="space-y-4 text-xs font-sans">
              {/* File Input */}
              <div className="space-y-1.5">
                <label className="text-slate-700 font-mono font-medium block">Archivo Excel / CSV de Leads *</label>
                <div className="border-2 border-dashed border-slate-300 hover:border-gold-500/80 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="excel-file-upload"
                  />
                  <label htmlFor="excel-file-upload" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-gold-600 mx-auto" />
                    <div className="text-slate-900 font-bold">
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
                <label className="text-slate-700 font-mono font-medium block">Nombre / Etiqueta de Campaña *</label>
                <input
                  type="text"
                  required
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  placeholder="Ej: Inversores Valencia Septiembre"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-gold-500 text-xs shadow-inner"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-slate-700 font-mono font-medium block">Categoría de Mercado</label>
                <select
                  value={newCampCategory}
                  onChange={(e) => setNewCampCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-gold-500 text-xs font-mono shadow-inner"
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
                <label className="text-slate-700 font-mono font-medium block">
                  Contexto de la Oferta / Mensaje IA (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={newCampContext}
                  onChange={(e) => setNewCampContext(e.target.value)}
                  placeholder="Ej: Invitación a evento presencial en Valencia, asesoría gratuita 2 días, descuentos del 15% al 20%, Golden Visa gratis..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-gold-500 text-xs leading-relaxed shadow-inner"
                />
              </div>

              {/* Optional Flyer Image */}
              <div className="space-y-1.5">
                <label className="text-slate-700 font-mono font-medium block">Imagen / Flyer Adjunto (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFlyer(e.target.files?.[0] || null)}
                  className="w-full text-slate-500 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-400 hover:to-gold-400 text-slate-950 font-black font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-gold-500/25 disabled:opacity-50"
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
