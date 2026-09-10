import React, { useState, useEffect, useRef } from 'react';
import { CrmCampaign, CrmLead, BatchDispatchStatus } from '../types';
import { apiService } from '../services/api';
import { useTranslation } from '../i18n/LanguageContext';
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

interface CampaignManagerProps {
  currentUser?: { email: string; agencyName: string };
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({ currentUser }) => {
  const { t, language } = useTranslation();
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('q3_outreach_campaign');
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [selectedLeadPreview, setSelectedLeadPreview] = useState<CrmLead | null>(null);

  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  const [isLoadingLeads, setIsLoadingLeads] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'sent'>('all');
  const [displayLimit, setDisplayLimit] = useState<number>(30);

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
      const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
      const isHomeAgency = currentUser?.agencyName?.toLowerCase().includes('home') || currentUser?.email?.includes('homeproperties');
      const res = await apiService.getCrmCampaigns();
      if (res?.campaigns) {
        let availableCampaigns = res.campaigns;
        if (isDemo) {
          // Demo mode: show only demo campaign
          let demoCamps = res.campaigns.filter((c: CrmCampaign) => c.id === 'demo_leads_outpilot');
          if (demoCamps.length === 0) {
            try {
              await fetch('/api/demo/seed', { method: 'POST' });
              const freshRes = await apiService.getCrmCampaigns();
              demoCamps = (freshRes?.campaigns || []).filter((c: CrmCampaign) => c.id === 'demo_leads_outpilot');
            } catch (e) {
              console.warn('Auto-seed demo campaign:', e);
            }
          }
          availableCampaigns = demoCamps;
        } else if (isHomeAgency) {
          availableCampaigns = res.campaigns.filter((c: CrmCampaign) => 
            (c.name?.toLowerCase().includes('home') || 
            c.category?.toLowerCase().includes('home')) &&
            c.id !== 'demo_leads_outpilot'
          );
        } else {
          // Real live system: show real campaigns, hide demo campaign
          availableCampaigns = res.campaigns.filter((c: CrmCampaign) => c.id !== 'demo_leads_outpilot');
        }
        setCampaigns(availableCampaigns);
        if (availableCampaigns.length > 0) {
          if (!selectedCampaignId || !availableCampaigns.some((c: CrmCampaign) => c.id === selectedCampaignId)) {
            setSelectedCampaignId(availableCampaigns[0].id);
          }
        } else {
          setSelectedCampaignId('');
          setLeads([]);
          setSelectedLeadPreview(null);
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

  const PROMPT_PRESETS = language === 'en' ? [
    {
      label: '🗓️ Webinar Invitation',
      text: 'Recall their previous interest and invite them to our upcoming live webinar. Request confirmation to save their spot.'
    },
    {
      label: '📱 New Feature Release',
      text: 'Highlight our new product features that save 20 hours a week. Ask which day/time works best this week for a brief online demo.'
    },
    {
      label: '📈 ROI & Case Study',
      text: 'Emphasize the 300% ROI seen by similar clients. Mention our current promotional offer and suggest a 1-on-1 strategy call.'
    },
    {
      label: '🎯 Cold Outreach',
      text: 'Introduce the value proposition briefly, focusing on cost reduction and efficiency. End with a low-friction question.'
    }
  ] : [
    {
      label: '🗓️ Invitación a Webinar',
      text: 'Recordar su interés previo e invitarles a nuestro próximo webinar en vivo. Pedir confirmación para guardar su plaza.'
    },
    {
      label: '📱 Nuevas Funciones',
      text: 'Destacar nuestras nuevas funciones que ahorran 20 horas a la semana. Preguntar qué día y hora le viene bien para una demo rápida.'
    },
    {
      label: '📈 Caso de Éxito',
      text: 'Enfatizar el ROI del 300% de clientes similares. Mencionar la promoción actual y proponer una llamada de estrategia.'
    },
    {
      label: '🎯 Contacto en Frío',
      text: 'Introducir la propuesta de valor brevemente, enfocándose en reducción de costes. Terminar con una pregunta sencilla.'
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
          setStatusMsg(`✨ ¡IA Groq Ultra-Rápida activada (con Gemini de respaldo)! Se redactaron ${res.updated_count} mensajes hiper-personalizados en tiempo récord.`);
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
    const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
    if (isDemo) {
      setSendingLeadId(lead.id);
      setTimeout(() => {
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
        setSendingLeadId(null);
        setStatusMsg(`🎯 [Modo Demo]: Simulación exitosa para ${lead.name}. (No se envió ningún WhatsApp real)`);
        setTimeout(() => setStatusMsg(null), 4000);
      }, 600);
      return;
    }

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
    const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
    if (isDemo) {
      setIsSendingTestMsg(true);
      setTimeout(() => {
        setIsSendingTestMsg(false);
        setStatusMsg(`🎯 [Modo Demo]: Mensaje de prueba simulado hacia ${testPhoneNumber}`);
        setTimeout(() => setStatusMsg(null), 4000);
      }, 600);
      return;
    }

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
    const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
    if (isDemo) {
      setStatusMsg('🎯 [Modo Demo]: El envío automático masivo real está deshabilitado para datos de prueba.');
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2.5 flex-wrap tracking-tight">
            <span>{t('campaigns.title', 'WhatsApp & Campaigns')}</span>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 font-bold">
              {t('common.connected', 'Gateway Connected')}
            </span>
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 max-w-2xl">
            {t('campaigns.subtitle', 'Execute high-touch conversational sequences with AI personalization and anti-ban safeguards.')}
          </p>
        </div>

        {/* Button: Add New Campaign via Excel */}
        <button
          onClick={() => setIsNewCampaignOpen(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-md shadow-primary-500/25 active:scale-95 transition-all text-xs uppercase tracking-wider self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('campaigns.newCampaignBtn', 'New Campaign (Excel / CSV)')}</span>
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
              className={`flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl text-xs transition-all ${
                isSelected
                  ? 'bg-primary-500 text-white font-extrabold shadow-md shadow-primary-500/25 scale-[1.01]'
                  : 'materio-card text-slate-800 dark:text-slate-200 font-bold hover:border-primary-500'
              }`}
            >
              <div className="text-left">
                <div className="font-extrabold text-sm">{camp.name}</div>
                <div className={`text-[11px] font-semibold mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>
                  {camp.sent_leads} / {camp.total_leads} {t('common.sent', 'sent').toLowerCase()} ({camp.pending_leads} {t('common.pending', 'pending').toLowerCase()})
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Toast */}
      {statusMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 text-xs p-3.5 rounded-xl font-bold text-center shadow-sm animate-fade-in">
          {statusMsg}
        </div>
      )}

      {/* Batch Automation Control Panel - Materio Card */}
      <div className="materio-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-950 dark:text-white">
                {t('campaigns.batchSenderTitle', 'Automated Sequential Batch Sender')}
              </span>
              {batchStatus?.status === 'running' && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold animate-pulse">
                  ● {t('campaigns.sending', 'Sending in Background')}
                </span>
              )}
              {batchStatus?.status === 'paused' && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                  ❚❚ {t('campaigns.pauseBatchBtn', 'Paused')}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('campaigns.batchSenderSubtitle', 'Human cadence delivery with random jitter to ensure 100% account safety.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Delay selector */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#201D34] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#3A354C]">
              <span>{t('campaigns.delayLabel', 'Delay:')}</span>
              <select
                value={batchDelay}
                onChange={(e) => setBatchDelay(Number(e.target.value))}
                disabled={batchStatus?.status === 'running'}
                className="bg-transparent text-slate-950 dark:text-white font-extrabold focus:outline-none cursor-pointer"
              >
                <option value={5} className="text-slate-900 dark:text-slate-900">5s ({t('common.fast', 'Fast / Test')})</option>
                <option value={8} className="text-slate-900 dark:text-slate-900">8s ({t('common.standard', 'Standard')})</option>
                <option value={20} className="text-slate-900 dark:text-slate-900">20s ({t('common.safe', 'Safe')})</option>
                <option value={45} className="text-slate-900 dark:text-slate-900">45s ({t('common.antiBan', 'Anti-Ban Shield')})</option>
              </select>
            </div>

            {/* Batch Action Buttons */}
            {batchStatus?.status === 'running' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleControlBatch('pause')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{t('campaigns.pauseBatchBtn', 'Pause')}</span>
                </button>
                <button
                  onClick={() => handleControlBatch('stop')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{t('campaigns.stopBatchBtn', 'Stop')}</span>
                </button>
              </div>
            ) : batchStatus?.status === 'paused' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleControlBatch('resume')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs shadow-md"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{t('campaigns.resumeBatchBtn', 'Resume')}</span>
                </button>
                <button
                  onClick={() => handleControlBatch('stop')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{t('campaigns.stopBatchBtn', 'Stop')}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartBatch}
                disabled={isStartingBatch || leads.length === 0}
                className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-primary-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                {isStartingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('campaigns.starting', 'Starting...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('campaigns.startBatchBtn', 'Start Batch')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Live Progress Bar if active */}
        {batchStatus && batchStatus.total > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#3A354C]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-800 dark:text-slate-200">
                Progreso:{' '}
                <b className="text-primary-600 dark:text-primary-400 font-extrabold">
                  {batchStatus.sent} / {batchStatus.total}
                </b>{' '}
                ({Math.round((batchStatus.sent / batchStatus.total) * 100)}%)
              </span>
              {batchStatus.current_lead_name && (
                <span className="text-primary-600 dark:text-primary-400 font-bold truncate max-w-[280px]">
                  Enviando ahora: {batchStatus.current_lead_name} ({batchStatus.current_lead_phone})
                </span>
              )}
            </div>
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.round((batchStatus.sent / batchStatus.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Campaign Workstation Grid - Materio Card */}
      <div className="materio-card p-5 sm:p-7 space-y-6">
        {/* Campaign Info & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#3A354C]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30 text-xs font-bold uppercase">
              {selectedCampaign?.category || 'Campaña'}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white mt-1.5 leading-tight tracking-tight">
              {selectedCampaign?.name || 'Selecciona una campaña'}
            </h2>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
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
                placeholder={t('campaigns.searchPlaceholder', 'Search by name, phone, or tags...')}
                className="bg-slate-50 dark:bg-[#201D34] border border-slate-200 dark:border-[#3A354C] rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-950 dark:text-white focus:outline-none focus:border-primary-500 w-full sm:w-56 shadow-sm"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#201D34] p-1 rounded-xl border border-slate-200 dark:border-[#3A354C] text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg font-extrabold transition ${
                  statusFilter === 'all' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                }`}
              >
                {t('common.all', 'All')} ({leads.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3.5 py-1.5 rounded-lg font-extrabold transition ${
                  statusFilter === 'pending' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                }`}
              >
                {t('common.pending', 'Pending')} ({leads.filter((l) => l.whatsapp_status !== 'sent').length})
              </button>
              <button
                onClick={() => setStatusFilter('sent')}
                className={`px-3.5 py-1.5 rounded-lg font-extrabold transition ${
                  statusFilter === 'sent' ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:text-slate-950'
                }`}
              >
                {t('common.sent', 'Sent')} ({leads.filter((l) => l.whatsapp_status === 'sent').length})
              </button>
            </div>

            <button
              onClick={() => selectedCampaignId && fetchLeads(selectedCampaignId)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#201D34] border border-slate-200 dark:border-[#3A354C] text-slate-700 dark:text-slate-300 hover:text-primary-500 shadow-sm"
              title={t('common.refresh', 'Refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLeads ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* AI Bot Instructions Card for this Campaign */}
        <div className="materio-card p-5 space-y-4 relative overflow-hidden bg-slate-50/60 dark:bg-[#201D34]/50 border border-slate-200 dark:border-[#3A354C]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center font-extrabold text-lg shadow-sm">
                <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                    {t('campaigns.aiPromptTitle', 'AI Message Prompt & Voice Persona')}
                  </h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-500/20 dark:text-primary-300 font-extrabold">
                    {selectedCampaign?.name || 'Active Campaign'}
                  </span>
                  {isAiConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-[10px] font-extrabold shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      ⚡ Groq LPU (Primary) + Gemini (Fallback)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold shadow-sm" title="Missing API keys">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Local Template Mode
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                  {t('campaigns.aiPromptSubtitle', 'Customizes the tone, investment pitch, and value proposition for this audience.')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsPromptPanelOpen(!isPromptPanelOpen)}
              className="text-xs font-extrabold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 self-end sm:self-auto px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#28243D] border border-slate-200 dark:border-[#3A354C] shadow-sm transition"
            >
              {isPromptPanelOpen ? t('campaigns.hidePromptPanel', 'Hide ▲') : t('campaigns.configurePromptPanel', 'Configure ▼')}
            </button>
          </div>

          {isPromptPanelOpen && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-[#3A354C] animate-fade-in">
              {/* Quick Preset Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{t('campaigns.quickPresets', 'Quick Presets (Click to insert):')}</span>
                <div className="flex flex-wrap gap-2">
                  {PROMPT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCampaignAiPrompt(preset.text)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-[#28243D] text-slate-800 dark:text-slate-200 hover:border-primary-500 border border-slate-200 dark:border-[#3A354C] shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
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
                  placeholder={t('campaigns.aiPromptPlaceholder', 'Example: Focus on how our platform reduces manual data entry by 40%, mention our upcoming integration, maintain a professional B2B tone...')}
                  className="w-full bg-white dark:bg-[#201D34] border border-slate-300 dark:border-[#3A354C] focus:border-primary-500 rounded-xl p-4 text-xs font-bold text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none leading-relaxed custom-scrollbar transition font-sans shadow-sm"
                />
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  ℹ️ {t('campaigns.aiPromptPreserveNote', 'Sent leads remain protected and intact; only pending leads will be regenerated.')} ({leads.filter((l) => l.whatsapp_status !== 'sent').length} {t('crm.stagePending', 'pending')})
                </span>

                <button
                  type="button"
                  onClick={handleUpdateAiPrompt}
                  disabled={isUpdatingPrompt}
                  className="flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-extrabold px-6 py-3 rounded-xl shadow-md shadow-primary-500/25 active:scale-95 transition-all text-xs uppercase tracking-wider disabled:opacity-50 shrink-0"
                >
                  {isUpdatingPrompt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('campaigns.regeneratingMessages', 'Regenerating Messages...')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{t('campaigns.applyAndRegenerate', '⚡ Apply & Regenerate Messages')}</span>
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
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Leads ({filteredLeads.length})</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">● Persistencia Online 100% Activa</span>
            </div>

            <div className="max-h-[580px] overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
              {filteredLeads.slice(0, displayLimit).map((lead, idx) => {
                const isSent = lead.whatsapp_status === 'sent';
                const isSendingThis = sendingLeadId === lead.id;
                const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
                const waDirectLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lead.personalized_message || '')}`;

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadPreview(lead)}
                    className={`p-4 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      selectedLeadPreview?.id === lead.id
                        ? 'bg-primary-50/70 dark:bg-primary-950/30 border-2 border-primary-500 shadow-md shadow-primary-500/15'
                        : 'materio-card hover:border-primary-400'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-700 dark:text-primary-300 font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="font-extrabold text-slate-950 dark:text-white flex items-center gap-2 flex-wrap">
                          <span className="text-base truncate">{lead.name}</span>
                          {isSent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/40">
                              <CheckCircle2 className="w-3 h-3" /> Enviado ({lead.last_sent_type || 'manual'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                              Pendiente
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                          {lead.phone} {lead.email ? `• ${lead.email}` : ''}
                        </div>

                        {lead.last_contact_date && (
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Fecha de envío: {lead.last_contact_date}
                          </div>
                        )}

                        {lead.notes && (
                          <div className="text-xs font-extrabold text-amber-950 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 inline-block truncate max-w-full">
                            Nota: {lead.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition shadow-sm flex items-center justify-center active:scale-95"
                          title="Llamar directamente al lead"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}

                      <a
                        href={waDirectLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#201D34] hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-300 hover:text-primary-600 border border-slate-200 dark:border-[#3A354C] transition flex items-center justify-center active:scale-95"
                        title="Abrir en WhatsApp Web"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendSingleLead(lead);
                        }}
                        disabled={isSendingThis}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
                          isSent
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/25'
                        }`}
                        title={isSent ? "Reenviar mensaje de WhatsApp" : "Enviar mensaje de WhatsApp"}
                      >
                        {isSendingThis ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSent ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {displayLimit < filteredLeads.length && (
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + 40)}
                  className="w-full py-3.5 px-4 rounded-xl materio-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold transition shadow-sm"
                >
                  ➕ Ver más leads ({filteredLeads.length - displayLimit} restantes)
                </button>
              )}

              {filteredLeads.length === 0 && (
                <div className="py-16 text-center text-slate-500 font-bold text-xs">
                  {t('common.noResults', 'No leads match the filters.')}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Message Preview in WhatsApp Phone Bubble (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>{t('common.preview', 'Message Preview')}</span>
              <span className="text-primary-600 dark:text-primary-400 font-extrabold truncate max-w-[180px]">{selectedLeadPreview?.name || t('campaigns.selectLead', 'Select a lead')}</span>
            </div>

            {selectedLeadPreview ? (
              <div className="materio-card p-5 space-y-4 shadow-xl relative">
                {/* Contact Header with Edit Action */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#3A354C]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-500 text-white font-extrabold flex items-center justify-center text-base shadow-md shadow-primary-500/25">
                      {selectedLeadPreview.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-950 dark:text-white text-base leading-snug">{selectedLeadPreview.name}</h4>
                      <p className="text-xs text-primary-600 dark:text-primary-400 font-extrabold">{selectedLeadPreview.phone}</p>
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#201D34] border border-slate-200 dark:border-[#3A354C] hover:border-primary-500 text-slate-800 dark:text-slate-200 text-xs font-bold transition shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingLeadMsg ? 'Cancelar' : 'Editar Texto'}</span>
                  </button>
                </div>

                {/* WhatsApp Chat Bubble or Inline Editor */}
                <div className="space-y-3">
                  {isEditingLeadMsg ? (
                    <div className="space-y-2.5 animate-fade-in">
                      <div className="text-xs font-extrabold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                        <span>✏️ Editando mensaje para {selectedLeadPreview.name.split(' ')[0]}:</span>
                      </div>
                      <textarea
                        rows={8}
                        value={editedLeadMsgText}
                        onChange={(e) => setEditedLeadMsgText(e.target.value)}
                        className="w-full bg-white dark:bg-[#201D34] border border-slate-300 dark:border-[#3A354C] rounded-xl p-3.5 text-xs font-bold text-slate-950 dark:text-white leading-relaxed focus:outline-none focus:border-primary-500 custom-scrollbar shadow-sm"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingLeadMsg(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#201D34] text-slate-800 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold border border-slate-200 dark:border-[#3A354C]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveIndividualMessage}
                          disabled={isSavingLeadMsg}
                          className="px-4 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/25 active:scale-95 disabled:opacity-50"
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
                    <div className="bg-slate-100/80 dark:bg-[#201D34] border border-slate-200 dark:border-[#3A354C] rounded-2xl p-3.5 space-y-2">
                      <div className="bg-white dark:bg-[#28243D] border border-slate-200 dark:border-[#3A354C] rounded-xl rounded-tl-none p-4 text-xs font-semibold text-slate-950 dark:text-slate-100 leading-relaxed whitespace-pre-line shadow-sm max-h-72 overflow-y-auto custom-scrollbar">
                        {selectedLeadPreview.personalized_message}
                      </div>
                    </div>
                  )}

                  {selectedLeadPreview.last_contact_date && (
                    <div className="text-right text-xs text-emerald-700 dark:text-emerald-400 font-extrabold">
                      ✅ Mensaje enviado: {selectedLeadPreview.last_contact_date}
                    </div>
                  )}
                </div>

                {/* Action Buttons: Real Send + Test to My WhatsApp */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 pt-1">
                    {/* 1-Click Send Button to Client */}
                    <button
                      onClick={() => handleSendSingleLead(selectedLeadPreview)}
                      disabled={sendingLeadId === selectedLeadPreview.id}
                      className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-primary-500/25 active:scale-95 transition-all disabled:opacity-50"
                      title="Enviar mensaje oficial por WhatsApp"
                    >
                      {sendingLeadId === selectedLeadPreview.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                      <span>Enviar WhatsApp</span>
                    </button>

                    {/* Direct Phone Call Button */}
                    <a
                      href={`tel:${selectedLeadPreview.phone.replace(/[^0-9+]/g, '')}`}
                      className="w-12 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 active:scale-95 transition-all shrink-0"
                      title="Llamar directamente al lead"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    {/* WhatsApp Web link */}
                    <a
                      href={`https://wa.me/${(selectedLeadPreview.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(selectedLeadPreview.personalized_message || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-11 bg-slate-100 dark:bg-[#201D34] hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#3A354C] rounded-xl flex items-center justify-center transition active:scale-95 shrink-0"
                      title="Abrir en WhatsApp Web"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Send Test to My Personal WhatsApp */}
                  <div className="p-3.5 bg-slate-50 dark:bg-[#201D34] border border-slate-200 dark:border-[#3A354C] rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-800 dark:text-slate-200">
                      <span className="font-extrabold flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-primary-500" />
                        {t('campaigns.testSendTitle', 'Test on personal WhatsApp')}:
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingTestPhone(!isEditingTestPhone)}
                        className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-extrabold"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
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
                          className="flex-1 bg-white dark:bg-[#28243D] border border-slate-300 dark:border-[#3A354C] rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-950 dark:text-white shadow-inner focus:outline-none focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => setIsEditingTestPhone(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-extrabold shadow-sm"
                        >
                          {t('common.save', 'Done')}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSendTestToMyPhone}
                      disabled={isSendingTestMsg}
                      className="w-full bg-white dark:bg-[#28243D] hover:bg-primary-50 dark:hover:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-500/40 font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {isSendingTestMsg ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                          <span>{t('campaigns.sending', 'Sending test preview...')}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-primary-600" />
                          <span>{t('campaigns.testSendBtn', 'Send Test Preview')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="materio-card p-8 text-center text-slate-500 font-bold text-xs">
                Selecciona un lead de la lista para ver su mensaje personalizado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Nueva Campaña (Cargar Excel / CSV) */}
      {isNewCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="materio-card bg-white dark:bg-[#28243D] border border-slate-200 dark:border-[#3A354C] rounded-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 relative shadow-2xl text-slate-950 dark:text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewCampaignOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-[#201D34] hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center shadow-sm">
                <FileSpreadsheet className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-950 dark:text-white">Nueva Campaña de Leads</h3>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sube un Excel (.xlsx) o CSV con nombres, teléfonos y notas.</p>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadCampaign} className="space-y-4 text-xs font-sans">
              {/* File Input */}
              <div className="space-y-1.5">
                <label className="text-slate-800 dark:text-slate-200 font-bold block">Archivo Excel / CSV de Leads *</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-[#3A354C] hover:border-primary-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-50 dark:bg-[#201D34]">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="excel-file-upload"
                  />
                  <label htmlFor="excel-file-upload" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-primary-500 mx-auto" />
                    <div className="text-slate-950 dark:text-white font-extrabold">
                      {selectedFile ? selectedFile.name : 'Haz clic para seleccionar o arrastra tu archivo'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold">
                      Soporta .xlsx, .xls y .csv (Meta Ads, Google Ads o listas propias)
                    </div>
                  </label>
                </div>
              </div>

              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-slate-800 dark:text-slate-200 font-bold block">Nombre / Etiqueta de Campaña *</label>
                <input
                  type="text"
                  required
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  placeholder="Ej: Inversores Valencia Septiembre"
                  className="w-full bg-slate-50 dark:bg-[#201D34] border border-slate-300 dark:border-[#3A354C] rounded-xl px-4 py-2.5 text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 text-xs font-bold shadow-sm"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-slate-800 dark:text-slate-200 font-bold block">Categoría de Mercado</label>
                <select
                  value={newCampCategory}
                  onChange={(e) => setNewCampCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#201D34] border border-slate-300 dark:border-[#3A354C] rounded-xl px-4 py-2.5 text-slate-950 dark:text-white focus:outline-none focus:border-primary-500 text-xs font-bold shadow-sm"
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
                <label className="text-slate-800 dark:text-slate-200 font-bold block">
                  Contexto de la Oferta / Mensaje IA (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={newCampContext}
                  onChange={(e) => setNewCampContext(e.target.value)}
                  placeholder="Ej: Invitación a evento presencial en Valencia, asesoría gratuita 2 días, descuentos del 15% al 20%, Golden Visa gratis..."
                  className="w-full bg-slate-50 dark:bg-[#201D34] border border-slate-300 dark:border-[#3A354C] rounded-xl p-3 text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 text-xs font-bold leading-relaxed shadow-sm"
                />
              </div>

              {/* Optional Flyer Image */}
              <div className="space-y-1.5">
                <label className="text-slate-800 dark:text-slate-200 font-bold block">Imagen / Flyer Adjunto (Opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFlyer(e.target.files?.[0] || null)}
                  className="w-full text-slate-600 dark:text-slate-300 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#201D34] text-slate-800 dark:text-slate-200 hover:bg-slate-200 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-primary-500/25 disabled:opacity-50"
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
