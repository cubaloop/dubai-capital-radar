import React, { useState, useEffect, useMemo } from 'react';
import { CrmLead, CrmLeadStatus } from '../types';
import { apiService } from '../services/api';
import { KanbanBoard } from '../components/crm/KanbanBoard';
import { AdhdFocusView } from '../components/crm/AdhdFocusView';
import { LeadDetailModal } from '../components/crm/LeadDetailModal';
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
      // If user is H.O.M.E Properties, show isolated workspace for new client
      const isHomeAgency = currentUser?.agencyName?.toLowerCase().includes('home') || currentUser?.email?.includes('homeproperties');
      const res = await apiService.getAllCrmLeads();
      if (res?.leads) {
        if (isHomeAgency) {
          // Isolated: only show leads specifically uploaded for HOME Properties
          const homeLeads = res.leads.filter((l: CrmLead) => 
            l.campaign_name?.toLowerCase().includes('home') || 
            l.campaign_category?.toLowerCase().includes('home')
          );
          setLeads(homeLeads);
        } else {
          setLeads(res.leads);
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
    try {
      await apiService.patchCrmLead(leadId, { crm_status: status });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAddNote = async (leadId: string, content: string) => {
    try {
      await apiService.addLeadNote(leadId, { author: 'Agente', content, type: 'note' });
      setNotificationMsg('✅ Nota guardada en el historial.');
      setTimeout(() => setNotificationMsg(null), 3000);
      fetchLeads();
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleSetReminder = async (leadId: string, hoursAhead: number) => {
    const reminderIso = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, next_reminder_date: reminderIso } : l))
    );
    await apiService.patchCrmLead(leadId, { next_reminder_date: reminderIso });
    setNotificationMsg(`⏰ Recordatorio programado para dentro de ${hoursAhead}h.`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleSendWhatsApp = async (lead: CrmLead) => {
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-slate-900 flex items-center gap-3">
            <span>CRM Inteligente TDAH</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-700 border border-gold-400 font-mono font-bold">
              Enfoque Máximo
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Gestión visual sin saturación cognitiva: una tarjeta a la vez o tablero Kanban interactivo.
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 card-3d self-start md:self-auto">
          <button
            onClick={() => setViewMode('focus')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
              viewMode === 'focus'
                ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deck Focus TDAH</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition ${
              viewMode === 'kanban'
                ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tablero Kanban</span>
          </button>
        </div>
      </div>

      {/* Stats Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 card-3d space-y-1">
          <div className="text-[11px] font-mono text-slate-500">Total Leads</div>
          <div className="text-lg font-bold text-slate-900 font-mono">{stats.total}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 card-3d space-y-1">
          <div className="text-[11px] font-mono text-emerald-600">Contactados</div>
          <div className="text-lg font-bold text-emerald-700 font-mono">{stats.contacted}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 card-3d space-y-1">
          <div className="text-[11px] font-mono text-rose-600">Sin Contacto (Alerta)</div>
          <div className="text-lg font-bold text-rose-700 font-mono">{stats.uncontacted}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 card-3d space-y-1">
          <div className="text-[11px] font-mono text-indigo-600">Citas / Zoom</div>
          <div className="text-lg font-bold text-indigo-700 font-mono">{stats.appointments}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 card-3d space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-mono text-amber-700">Cerrados / Ventas</div>
          <div className="text-lg font-bold text-amber-800 font-mono">{stats.closed}</div>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3.5 rounded-2xl font-mono text-center shadow-lg animate-fade-in">
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
            placeholder="Buscar por nombre, teléfono, notas..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-gold-500 font-mono"
          />
        </div>

        {/* Campaign Filter */}
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-gold-500"
        >
          <option value="all">Todas las Campañas</option>
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
          <option value="all">Todas las Etapas</option>
          <option value="CREATED">Nuevos</option>
          <option value="CONTACTED">Contactados</option>
          <option value="FOLLOW_UP">En Seguimiento</option>
          <option value="APPOINTMENT">Cita / Zoom</option>
          <option value="RESERVATION">Reserva EOI</option>
          <option value="CLOSED">Cerrados</option>
          <option value="LOST">Descartados</option>
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
          <span>Alerta TDAH</span>
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
