import React, { useState, useEffect } from 'react';
import { CrmLead, CrmLeadStatus, LeadNoteItem } from '../../types';
import { apiService } from '../../services/api';
import {
  X,
  Phone,
  Mail,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle2,
  Send,
  Loader2,
  Tag,
  Plus
} from 'lucide-react';

interface LeadDetailModalProps {
  lead: CrmLead | null;
  onClose: () => void;
  onUpdateLeadStatus: (leadId: string, status: CrmLeadStatus) => void;
  onSendWhatsApp: (lead: CrmLead) => Promise<void>;
  sendingLeadId: string | null;
}

const STAGES: { id: CrmLeadStatus; label: string }[] = [
  { id: 'CREATED', label: 'Nuevo' },
  { id: 'CONTACTED', label: 'Contactado' },
  { id: 'FOLLOW_UP', label: 'En Seguimiento' },
  { id: 'APPOINTMENT', label: 'Cita / Zoom' },
  { id: 'RESERVATION', label: 'Reserva EOI' },
  { id: 'CLOSED', label: 'Cerrado / Venta' },
  { id: 'LOST', label: 'Descartado' }
];

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onUpdateLeadStatus,
  onSendWhatsApp,
  sendingLeadId
}) => {
  const [notes, setNotes] = useState<LeadNoteItem[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  useEffect(() => {
    if (lead) {
      apiService.getLeadNotes(lead.id).then((res) => {
        if (res?.notes) setNotes(res.notes);
      }).catch(() => null);
    }
  }, [lead]);

  if (!lead) return null;

  const cleanDigits = (lead.phone || '').replace(/[^0-9]/g, '');
  const waWebLink = `https://wa.me/${cleanDigits}`;

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      setIsSubmittingNote(true);
      const res = await apiService.addLeadNote(lead.id, {
        author: 'Agente / Broker',
        content: newNoteContent.trim(),
        type: 'note'
      });
      if (res?.note) {
        setNotes([res.note, ...notes]);
        setNewNoteContent('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lead Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 font-bold uppercase">
              {lead.campaign_name || lead.campaign_id}
            </span>
            {lead.whatsapp_status === 'sent' && (
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full font-mono inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
              </span>
            )}
          </div>
          <h2 className="text-2xl font-serif-luxury font-bold text-white">{lead.name}</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono pt-1">
            <a href={`tel:${cleanDigits}`} className="hover:text-gold-400 transition flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-gold-400" /> {lead.phone}
            </a>
            {lead.email && <span>• {lead.email}</span>}
          </div>
        </div>

        {/* Lifecycle Stage Buttons */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-slate-400">Etapa en el CRM:</div>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => onUpdateLeadStatus(lead.id, s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition font-mono ${
                  lead.crm_status === s.id
                    ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp Send Action */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Mensaje de WhatsApp:</span>
            <a
              href={waWebLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Abrir WhatsApp Web
            </a>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 max-h-40 overflow-y-auto custom-scrollbar">
            {lead.personalized_message || 'Sin mensaje generado.'}
          </div>

          <button
            onClick={() => onSendWhatsApp(lead)}
            disabled={sendingLeadId === lead.id}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {sendingLeadId === lead.id ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Despachando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar WhatsApp Oficial con Flyer</span>
              </>
            )}
          </button>
        </div>

        {/* Lead Notes & Chronological History */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-mono text-slate-400 font-bold uppercase">Notas e Historial de Contacto</h4>

          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              placeholder="Añadir nota de seguimiento o acuerdo de llamada..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
            />
            <button
              onClick={handleAddNote}
              disabled={isSubmittingNote}
              className="px-4 py-2.5 rounded-xl bg-gold-500 text-slate-950 font-bold text-xs font-mono hover:bg-gold-400 transition"
            >
              Añadir
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {lead.notes && (
              <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/20 text-xs text-gold-200">
                <span className="font-bold text-[10px] uppercase font-mono block text-gold-400">Nota Original Meta Ads:</span>
                {lead.notes}
              </div>
            )}
            {notes.map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{n.author}</span>
                  <span>{n.created_at}</span>
                </div>
                <div className="text-slate-200">{n.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
