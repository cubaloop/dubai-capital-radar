import React, { useState } from 'react';
import { CrmLead, CrmLeadStatus } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Clock,
  Tag,
  DollarSign,
  Plus,
  MessageSquare,
  Filter,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Send,
  Loader2
} from 'lucide-react';

interface AdhdFocusViewProps {
  leads: CrmLead[];
  onUpdateLeadStatus: (leadId: string, status: CrmLeadStatus) => void;
  onAddNote: (leadId: string, content: string) => void;
  onSetReminder: (leadId: string, hoursAhead: number) => void;
  onSendWhatsApp: (lead: CrmLead) => Promise<void>;
  sendingLeadId: string | null;
}

const STAGE_BUTTONS: { id: CrmLeadStatus; label: string; color: string }[] = [
  { id: 'CREATED', label: 'Nuevo', color: 'bg-blue-600 hover:bg-blue-500' },
  { id: 'CONTACTED', label: 'Contactado', color: 'bg-cyan-600 hover:bg-cyan-500' },
  { id: 'FOLLOW_UP', label: 'En Seguimiento', color: 'bg-amber-600 hover:bg-amber-500' },
  { id: 'APPOINTMENT', label: 'Cita / Zoom', color: 'bg-indigo-600 hover:bg-indigo-500' },
  { id: 'RESERVATION', label: 'Reserva EOI', color: 'bg-purple-600 hover:bg-purple-500' },
  { id: 'CLOSED', label: 'Cerrado / Venta', color: 'bg-emerald-600 hover:bg-emerald-500' }
];

export const AdhdFocusView: React.FC<AdhdFocusViewProps> = ({
  leads,
  onUpdateLeadStatus,
  onAddNote,
  onSetReminder,
  onSendWhatsApp,
  sendingLeadId
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newNoteText, setNewNoteText] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (!leads.length) {
    return (
      <div className="py-16 text-center text-slate-400 font-mono text-sm">
        No hay leads registrados en este filtro.
      </div>
    );
  }

  const currentLead = leads[currentIndex] || leads[0];
  const cleanDigits = (currentLead.phone || '').replace(/[^0-9]/g, '');
  const waWebLink = `https://wa.me/${cleanDigits}`;

  // Check if overdue for contact (>24 hours without contact)
  const isOverdue = !currentLead.last_contact_date;

  const handleNext = () => {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();
    setTouchStartX(null);
  };

  const submitNote = () => {
    if (!newNoteText.trim()) return;
    onAddNote(currentLead.id, newNoteText.trim());
    setNewNoteText('');
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Top Deck Counter & Controls */}
      <div className="flex items-center justify-between bg-slate-900/80 px-5 py-3 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Lead <span className="text-white font-bold">{currentIndex + 1}</span> de{' '}
            <span className="text-white font-bold">{leads.length}</span>
          </span>
          <span className="text-xs text-gold-400 font-mono font-semibold truncate max-w-[200px]">
            {currentLead.campaign_name || currentLead.campaign_id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Anterior (Deslizar izquierda)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === leads.length - 1}
            className="p-2 rounded-xl bg-gold-500 text-slate-950 font-bold hover:bg-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Siguiente (Deslizar derecha)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main ADHD Focus Card */}
      <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 border border-gold-500/40 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Urgent ADHD Alert Banner if never contacted */}
        {isOverdue && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-950/70 border border-rose-600/50 text-rose-200 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              ⚡ <b>Alerta TDAH:</b> Este lead aún no ha sido contactado. ¡Toma acción ahora!
            </span>
          </div>
        )}

        {/* Lead Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-serif-luxury font-bold text-white flex items-center gap-3">
              <span>{currentLead.name}</span>
              {currentLead.whatsapp_status === 'sent' && (
                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full font-mono font-normal inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Enviado ({currentLead.last_sent_type || 'manual'})
                </span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-1">
              <a href={`tel:${cleanDigits}`} className="hover:text-gold-400 transition flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gold-400" /> {currentLead.phone}
              </a>
              {currentLead.email && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Mail className="w-3.5 h-3.5" /> {currentLead.email}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white font-mono uppercase">
              {currentLead.crm_status}
            </span>
          </div>
        </div>

        {/* Lead Context Data Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono">Objetivo</div>
            <div className="text-white font-semibold">{currentLead.objective || 'Inversión'}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono">Plazo / Timeline</div>
            <div className="text-white font-semibold">{currentLead.timeline || 'Próximos meses'}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="text-slate-400 font-mono">Presupuesto</div>
            <div className="text-gold-400 font-semibold font-mono">
              {currentLead.budget_eur ? `${currentLead.budget_eur.toLocaleString()} €` : 'A consultar'}
            </div>
          </div>
        </div>

        {/* Historical Notes */}
        {currentLead.notes && (
          <div className="p-4 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-xs text-gold-200 leading-relaxed">
            <span className="font-bold font-mono uppercase block text-[10px] text-gold-400 mb-1">
              Notas Previas del Cliente:
            </span>
            {currentLead.notes}
          </div>
        )}

        {/* Personalized AI Message Preview & Send Action */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Mensaje Personalizado WhatsApp:</span>
            {currentLead.last_contact_date && (
              <span className="text-emerald-400">
                Último contacto: {currentLead.last_contact_date}
              </span>
            )}
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line max-h-48 overflow-y-auto custom-scrollbar">
            {currentLead.personalized_message || 'Sin mensaje generado.'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onSendWhatsApp(currentLead)}
              disabled={sendingLeadId === currentLead.id}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {sendingLeadId === currentLead.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Despachando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar WhatsApp Oficial (1 Clic)</span>
                </>
              )}
            </button>

            <a
              href={waWebLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold py-3.5 rounded-2xl text-xs font-mono flex items-center justify-center gap-2 transition"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Abrir en WhatsApp Web</span>
            </a>
          </div>
        </div>

        {/* Quick Stage Transition Buttons */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <div className="text-[11px] font-mono text-slate-400">Cambiar Etapa con 1 Toque:</div>
          <div className="flex flex-wrap gap-2">
            {STAGE_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => onUpdateLeadStatus(currentLead.id, btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-sm ${btn.color} ${
                  currentLead.crm_status === btn.id ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Follow-up Reminders */}
        <div className="space-y-2 pt-2">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gold-400" /> Programar Recordatorio:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSetReminder(currentLead.id, 2)}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono"
            >
              En 2 Horas
            </button>
            <button
              onClick={() => onSetReminder(currentLead.id, 24)}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono"
            >
              Mañana (24h)
            </button>
            <button
              onClick={() => onSetReminder(currentLead.id, 72)}
              className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono"
            >
              En 3 Días
            </button>
          </div>
        </div>

        {/* Add Quick Note */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNote()}
              placeholder="Escribe una nota rápida de la llamada..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 font-sans"
            />
            <button
              onClick={submitNote}
              className="px-4 py-2 rounded-xl bg-gold-500 text-slate-950 font-bold text-xs font-mono hover:bg-gold-400 transition"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
