import React from 'react';
import { CrmLead, CrmLeadStatus } from '../../types';
import { Phone, MessageSquare, Clock, AlertCircle, CheckCircle2, ChevronRight, User } from 'lucide-react';

interface KanbanBoardProps {
  leads: CrmLead[];
  onSelectLead: (lead: CrmLead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: CrmLeadStatus) => void;
}

interface KanbanColConfig {
  id: CrmLeadStatus;
  title: string;
  badgeColor: string;
  borderColor: string;
}

const KANBAN_COLUMNS: KanbanColConfig[] = [
  { id: 'CREATED', title: 'Nuevos', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40', borderColor: 'border-blue-500/30' },
  { id: 'CONTACTED', title: 'Contactados', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', borderColor: 'border-cyan-500/30' },
  { id: 'FOLLOW_UP', title: 'En Seguimiento', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', borderColor: 'border-amber-500/30' },
  { id: 'APPOINTMENT', title: 'Cita / Zoom', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', borderColor: 'border-indigo-500/30' },
  { id: 'RESERVATION', title: 'Reserva / EOI', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', borderColor: 'border-purple-500/30' },
  { id: 'CLOSED', title: 'Cerrados', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', borderColor: 'border-emerald-500/30' },
  { id: 'LOST', title: 'Descartados', badgeColor: 'bg-slate-700/40 text-slate-400 border-slate-700', borderColor: 'border-slate-800' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  onSelectLead,
  onUpdateLeadStatus
}) => {
  const [draggedLeadId, setDraggedLeadId] = React.useState<string | null>(null);

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
            className="flex-shrink-0 w-80 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex flex-col space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${col.badgeColor}`}>
                  {col.title}
                </span>
                <span className="text-xs text-slate-400 font-mono">({colLeads.length})</span>
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
                    className="p-4 rounded-xl bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 hover:border-gold-500/50 transition-all cursor-pointer shadow-lg space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-white group-hover:text-gold-300 transition-colors">
                        {lead.name}
                      </div>
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/80 font-mono">
                          <CheckCircle2 className="w-3 h-3" /> Enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                          Pendiente
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 font-mono">
                      {lead.phone}
                    </div>

                    {lead.notes && (
                      <div className="text-[11px] text-slate-300 line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
                        {lead.notes}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <span className="truncate max-w-[150px] text-gold-400 font-mono">
                        {lead.campaign_name || lead.campaign_id}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition"
                          title="Abrir WhatsApp Web"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {colLeads.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-600 font-mono">
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
