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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar card-3d-gold relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition border border-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lead Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-700 font-bold uppercase border border-gold-300">
              {lead.campaign_name || lead.campaign_id}
            </span>
            {lead.whatsapp_status === 'sent' && (
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 rounded-full font-mono inline-flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Enviado
              </span>
            )}
          </div>
          <h2 className="text-2xl font-serif-luxury font-bold text-slate-900">{lead.name}</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono pt-1">
            <a href={`tel:${cleanDigits}`} className="hover:text-gold-700 transition flex items-center gap-1 font-semibold">
              <Phone className="w-3.5 h-3.5 text-gold-600" /> {lead.phone}
            </a>
            {lead.email && <span>• {lead.email}</span>}
          </div>
        </div>

        {/* Lifecycle Stage Buttons */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-slate-500">Etapa en el CRM:</div>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => onUpdateLeadStatus(lead.id, s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition font-mono ${
                  lead.crm_status === s.id
                    ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20 scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp Send Action */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Mensaje de WhatsApp:</span>
            <a
              href={waWebLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Abrir WhatsApp Web
            </a>
          </div>
          <div className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto custom-scrollbar">
            {lead.personalized_message || 'Sin mensaje generado.'}
          </div>

          <button
            onClick={() => onSendWhatsApp(lead)}
            disabled={sendingLeadId === lead.id}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black py-3 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
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
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-mono text-slate-500 font-bold uppercase">Notas e Historial de Contacto</h4>

          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              placeholder="Añadir nota de seguimiento o acuerdo de llamada..."
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-gold-500"
            />
            <button
              onClick={handleAddNote}
              disabled={isSubmittingNote}
              className="px-4 py-2.5 rounded-xl bg-gold-500 text-slate-950 font-bold text-xs font-mono hover:bg-gold-400 transition shadow-sm"
            >
              Añadir
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {lead.notes && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold text-[10px] uppercase font-mono block text-amber-700">Nota Original Meta Ads:</span>
                {lead.notes}
              </div>
            )}
            {notes.map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{n.author}</span>
                  <span>{n.created_at}</span>
                </div>
                <div className="text-slate-800">{n.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
