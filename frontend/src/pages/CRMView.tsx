import React, { useState, useEffect, useMemo } from 'react';
import { CrmLead, CrmLeadStatus } from '../types';
import { apiService } from '../services/api';
import { KanbanBoard } from '../components/crm/KanbanBoard';
import { AdhdFocusView } from '../components/crm/AdhdFocusView';
import { LeadDetailModal } from '../components/crm/LeadDetailModal';
import { useTranslation } from '../i18n/LanguageContext';
import {
  LayoutGrid,
  Sparkles,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface CRMViewProps {
  currentUser?: { email: string; agencyName: string };
}

export const CRMView: React.FC<CRMViewProps> = ({ currentUser }) => {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'focus' | 'kanban'>('focus');
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [adhdAlertOnly, setAdhdAlertOnly] = useState<boolean>(false);

  // Send feedback
  const [sendingLeadId, setSendingLeadId] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
      const isHomeAgency = currentUser?.agencyName?.toLowerCase().includes('home') || currentUser?.email?.includes('homeproperties');
      const res = await apiService.getAllCrmLeads();
      if (res?.leads) {
        if (isDemo) {
          // Isolated Demo Mode: only sample leads
          let demoLeads = res.leads.filter((l: CrmLead) => l.campaign_id === 'demo_leads_outpilot' || l.id.startsWith('demo_lead_'));
          if (demoLeads.length === 0) {
            try {
              await fetch('/api/demo/seed', { method: 'POST' });
              const freshRes = await apiService.getAllCrmLeads();
              demoLeads = (freshRes?.leads || []).filter((l: CrmLead) => l.campaign_id === 'demo_leads_outpilot' || l.id.startsWith('demo_lead_'));
            } catch (e) {
              console.warn('Auto-seed demo leads:', e);
            }
          }
          setLeads(demoLeads);
        } else if (isHomeAgency) {
          // Isolated: only show leads specifically uploaded for HOME Properties
          const homeLeads = res.leads.filter((l: CrmLead) => 
            (l.campaign_name?.toLowerCase().includes('home') || 
            l.campaign_category?.toLowerCase().includes('home')) &&
            !l.id.startsWith('demo_lead_') && l.campaign_id !== 'demo_leads_outpilot'
          );
          setLeads(homeLeads);
        } else {
          // Real live system: show real leads, NEVER show demo mock leads
          const realLeads = res.leads.filter((l: CrmLead) => !l.id.startsWith('demo_lead_') && l.campaign_id !== 'demo_leads_outpilot');
          setLeads(realLeads);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentUser?.email]);

  const handleUpdateLeadStatus = async (leadId: string, status: CrmLeadStatus) => {
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, crm_status: status, last_contact_date: new Date().toISOString() } : l))
    );
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, crm_status: status });
    }
    const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
    if (!isDemo) {
      try {
        await apiService.patchCrmLead(leadId, { crm_status: status });
      } catch (err) {
        console.error('Error updating status:', err);
      }
    }
  };

  const handleAddNote = async (leadId: string, content: string) => {
    try {
      const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
      if (!isDemo) {
        await apiService.addLeadNote(leadId, { author: 'Agente', content, type: 'note' });
      }
      setNotificationMsg('✅ Nota guardada en el historial.');
      setTimeout(() => setNotificationMsg(null), 3000);
      if (!isDemo) fetchLeads();
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleSetReminder = async (leadId: string, hoursAhead: number) => {
    const reminderIso = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, next_reminder_date: reminderIso } : l))
    );
    const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
    if (!isDemo) {
      await apiService.patchCrmLead(leadId, { next_reminder_date: reminderIso });
    }
    setNotificationMsg(`⏰ Recordatorio programado para dentro de ${hoursAhead}h.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleSendWhatsApp = async (lead: CrmLead) => {
    const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true' || new URLSearchParams(window.location.search).get('demo') === 'true';
    
    // In Demo Mode: simulate safely without calling real WhatsApp gateway
    if (isDemo) {
      setSendingLeadId(lead.id);
      setTimeout(() => {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, whatsapp_status: 'sent', last_sent_type: 'manual', last_contact_date: new Date().toLocaleString() }
              : l
          )
        );
        if (selectedLead && selectedLead.id === lead.id) {
          setSelectedLead({ ...selectedLead, whatsapp_status: 'sent', last_sent_type: 'manual' });
        }
        setSendingLeadId(null);
        setNotificationMsg(`🎯 [Modo Demo]: Simulación exitosa para ${lead.name}. (No se envió ningún WhatsApp real)`);
        setTimeout(() => setNotificationMsg(null), 4000);
      }, 600);
      return;
    }

    try {
      setSendingLeadId(lead.id);
      const res = await apiService.sendLeadWhatsApp(lead.id);
      if (res?.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id
              ? { ...l, whatsapp_status: 'sent', last_sent_type: 'manual', last_contact_date: new Date().toLocaleString() }
              : l
          )
        );
        if (selectedLead && selectedLead.id === lead.id) {
          setSelectedLead({ ...selectedLead, whatsapp_status: 'sent', last_sent_type: 'manual' });
        }
        setNotificationMsg(`✅ Mensaje WhatsApp enviado y registrado para ${lead.name}`);
      } else {
        setNotificationMsg(`⚠️ Error: ${res?.error || 'No entregado'}`);
      }
    } catch (err: any) {
      setNotificationMsg(`❌ Error: ${err.message}`);
    } finally {
      setSendingLeadId(null);
      setTimeout(() => setNotificationMsg(null), 4000);
    }
  };

  // Distinct campaigns for filter
  const campaignOptions = useMemo(() => {
    const setNames = new Set<string>();
    leads.forEach((l) => {
      if (l.campaign_name) setNames.add(l.campaign_name);
      else if (l.campaign_id) setNames.add(l.campaign_id);
    });
    return Array.from(setNames);
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = l.name.toLowerCase().includes(term);
        const matchPhone = l.phone.includes(term);
        const matchEmail = (l.email || '').toLowerCase().includes(term);
        const matchNotes = (l.notes || '').toLowerCase().includes(term);
        if (!matchName && !matchPhone && !matchEmail && !matchNotes) return false;
      }

      if (statusFilter !== 'all' && (l.crm_status || 'CREATED') !== statusFilter) return false;
      if (campaignFilter !== 'all' && l.campaign_name !== campaignFilter && l.campaign_id !== campaignFilter) return false;

      if (adhdAlertOnly) {
        // Only show leads that have never been contacted
        if (l.whatsapp_status === 'sent' || l.last_contact_date) return false;
      }

      return true;
    });
  }, [leads, searchTerm, statusFilter, campaignFilter, adhdAlertOnly]);

  // Stats Counters
  const stats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter((l) => l.whatsapp_status === 'sent' || l.crm_status !== 'CREATED').length;
    const appointments = leads.filter((l) => l.crm_status === 'APPOINTMENT').length;
    const closed = leads.filter((l) => l.crm_status === 'CLOSED').length;
    const uncontacted = leads.filter((l) => l.whatsapp_status !== 'sent' && !l.last_contact_date).length;
    return { total, contacted, appointments, closed, uncontacted };
  }, [leads]);

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <span>{t('crm.title', 'Investor Pipeline & CRM')}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#8C57FF]/15 text-[#8C57FF] font-bold">
              {t('common.active', 'Active')}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('crm.subtitle', 'Track qualified prospects, follow-up cadence, and deal progression in real-time.')}
          </p>
        </div>

        {/* View Switcher Buttons (Materio Segmented Control) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#28243D] border border-slate-200/80 dark:border-slate-800 shadow-sm self-start md:self-auto">
          <button
            onClick={() => setViewMode('focus')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'focus'
                ? 'bg-gradient-to-r from-[#8C57FF] to-[#7E4EE6] text-white shadow-md shadow-[#8C57FF]/25'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('crm.viewFocus', 'Focus Mode (TDAH)')}</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'kanban'
                ? 'bg-gradient-to-r from-[#8C57FF] to-[#7E4EE6] text-white shadow-md shadow-[#8C57FF]/25'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{t('crm.viewKanban', 'Kanban Board')}</span>
          </button>
        </div>
      </div>

      {/* Materio KPI Avatar Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Total Leads */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#28243D] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#8C57FF]/12 flex items-center justify-center text-[#8C57FF] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{t('campaigns.statsTotal', 'Total Leads')}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
          </div>
        </div>

        {/* Contacted */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#28243D] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{t('crm.stageContacted', 'Contacted')}</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.contacted}</div>
          </div>
        </div>

        {/* Uncontacted */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#28243D] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/12 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{t('crm.urgentOnly', 'Uncontacted')}</div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{stats.uncontacted}</div>
          </div>
        </div>

        {/* Appointments */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#28243D] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#16B1FF]/12 flex items-center justify-center text-[#16B1FF] shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{t('crm.stageClosing', 'Appointments')}</div>
            <div className="text-xl font-bold text-[#16B1FF]">{stats.appointments}</div>
          </div>
        </div>

        {/* Closed Won */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#28243D] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition flex items-center gap-3.5 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-amber-500/12 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{t('crm.stageWon', 'Closed Deals')}</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.closed}</div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs p-3.5 rounded-xl text-center shadow-lg animate-fade-in font-medium">
          {notificationMsg}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 card-3d backdrop-blur-md">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('crm.searchPlaceholder', 'Search by name, phone, notes...')}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-gold-500 font-mono"
          />
        </div>

        {/* Campaign Filter */}
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-gold-500"
        >
          <option value="all">{t('crm.allCampaigns', 'All Campaigns')}</option>
          {campaignOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-gold-500"
        >
          <option value="all">{t('crm.allStages', 'All Stages')}</option>
          <option value="CREATED">{t('crm.stageCreated', 'New Leads')}</option>
          <option value="CONTACTED">{t('crm.stageContacted', 'Contacted')}</option>
          <option value="INTERESTED">{t('crm.stageInterested', 'Interested / Replied')}</option>
          <option value="APPOINTMENT">{t('crm.stageClosing', 'Appointment')}</option>
          <option value="CLOSED">{t('crm.stageWon', 'Closed Deal')}</option>
          <option value="LOST">{t('crm.stageLost', 'Archived')}</option>
        </select>

        {/* ADHD Alert Filter Button */}
        <button
          onClick={() => setAdhdAlertOnly(!adhdAlertOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition ${
            adhdAlertOnly
              ? 'bg-rose-600 text-white'
              : 'bg-slate-50 text-slate-700 border border-slate-300 hover:border-rose-500/50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>{t('crm.urgentOnly', 'Alert Filter')}</span>
        </button>

        <button
          onClick={fetchLeads}
          className="p-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-600 hover:text-slate-900 transition"
          title="Recargar datos de la base de datos"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main View Mode Render */}
      {viewMode === 'focus' ? (
        <AdhdFocusView
          leads={filteredLeads}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onAddNote={handleAddNote}
          onSetReminder={handleSetReminder}
          onSendWhatsApp={handleSendWhatsApp}
          sendingLeadId={sendingLeadId}
        />
      ) : (
        <KanbanBoard
          leads={filteredLeads}
          onSelectLead={(l) => setSelectedLead(l)}
          onUpdateLeadStatus={handleUpdateLeadStatus}
        />
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdateLeadStatus={handleUpdateLeadStatus}
          onSendWhatsApp={handleSendWhatsApp}
          sendingLeadId={sendingLeadId}
        />
      )}
    </div>
  );
};
