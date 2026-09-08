import React from 'react';
import { CrmLead, CrmLeadStatus } from '../../types';
import { Phone, MessageSquare, Clock, AlertCircle, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

interface KanbanBoardProps {
  leads: CrmLead[];
  onSelectLead: (lead: CrmLead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: CrmLeadStatus) => void;
}

interface KanbanColConfig {
  id: CrmLeadStatus;
  badgeColor: string;
  borderColor: string;
}

const KANBAN_COLUMNS: KanbanColConfig[] = [
  { id: 'CREATED', badgeColor: 'bg-blue-500/20 text-blue-700 border-blue-500/40', borderColor: 'border-blue-500/30' },
  { id: 'CONTACTED', badgeColor: 'bg-cyan-500/20 text-cyan-700 border-cyan-500/40', borderColor: 'border-cyan-500/30' },
  { id: 'FOLLOW_UP', badgeColor: 'bg-amber-500/20 text-amber-700 border-amber-500/40', borderColor: 'border-amber-500/30' },
  { id: 'APPOINTMENT', badgeColor: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/40', borderColor: 'border-indigo-500/30' },
  { id: 'RESERVATION', badgeColor: 'bg-purple-500/20 text-purple-700 border-purple-500/40', borderColor: 'border-purple-500/30' },
  { id: 'CLOSED', badgeColor: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/40', borderColor: 'border-emerald-500/30' },
  { id: 'LOST', badgeColor: 'bg-slate-700/20 text-slate-600 border-slate-400', borderColor: 'border-slate-800' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  onSelectLead,
  onUpdateLeadStatus
}) => {
  const { t } = useTranslation();
  const [draggedLeadId, setDraggedLeadId] = React.useState<string | null>(null);

  const getColumnTitle = (id: CrmLeadStatus) => {
    switch (id) {
      case 'CREATED': return t('crm.stageCreated', 'New Leads');
      case 'CONTACTED': return t('crm.stageContacted', 'Contacted');
      case 'FOLLOW_UP': return t('crm.stageInterested', 'Follow-up');
      case 'APPOINTMENT': return t('crm.stageClosing', 'Appointment / Zoom');
      case 'RESERVATION': return t('crm.stageHot', 'Reservation / EOI');
      case 'CLOSED': return t('crm.stageWon', 'Closed Deals');
      case 'LOST': return t('crm.stageLost', 'Archived');
      default: return id;
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: CrmLeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      onUpdateLeadStatus(leadId, targetStatus);
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar min-h-[600px]">
      {KANBAN_COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => (l.crm_status || 'CREATED') === col.id);

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="flex-shrink-0 w-80 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-200 card-3d flex flex-col space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${col.badgeColor}`}>
                  {getColumnTitle(col.id)}
                </span>
                <span className="text-xs text-slate-500 font-mono">({colLeads.length})</span>
              </div>
            </div>

            {/* Leads in Column */}
            <div className="space-y-2.5 overflow-y-auto max-h-[620px] pr-1 custom-scrollbar">
              {colLeads.map((lead) => {
                const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
                const waLink = `https://wa.me/${cleanPhone}`;
                const isSent = lead.whatsapp_status === 'sent';

                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => onSelectLead(lead)}
                    className="p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-gold-500/60 card-3d transition-all cursor-pointer space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 group-hover:text-gold-700 transition-colors">
                        {lead.name}
                      </div>
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-mono border border-slate-200">
                          Pendiente
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 font-mono">
                      {lead.phone}
                    </div>

                    {lead.notes && (
                      <div className="text-[11px] text-slate-700 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        {lead.notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="truncate max-w-[150px] text-gold-700 font-mono font-semibold">
                        {lead.campaign_name || lead.campaign_id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition flex items-center justify-center active:scale-95"
                            title="Llamar directamente al lead"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition flex items-center justify-center active:scale-95"
                          title="Abrir WhatsApp Web"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center active:scale-95"
                          title="Ver detalle del lead"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {colLeads.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 font-mono">
                  Sin leads en esta etapa
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
