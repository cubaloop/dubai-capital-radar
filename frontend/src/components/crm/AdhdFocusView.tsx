import React, { useState } from 'react';
import { CrmLead, CrmLeadStatus } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
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
  Loader2,
  ExternalLink
} from 'lucide-react';

interface AdhdFocusViewProps {
  leads: CrmLead[];
  onUpdateLeadStatus: (leadId: string, status: CrmLeadStatus) => void;
  onAddNote: (leadId: string, content: string) => void;
  onSetReminder: (leadId: string, hoursAhead: number) => void;
  onSendWhatsApp: (lead: CrmLead) => Promise<void>;
  sendingLeadId: string | null;
}

const STAGE_KEYS: { id: CrmLeadStatus; color: string }[] = [
  { id: 'CREATED', color: 'bg-blue-600 hover:bg-blue-500' },
  { id: 'CONTACTED', color: 'bg-cyan-600 hover:bg-cyan-500' },
  { id: 'FOLLOW_UP', color: 'bg-amber-600 hover:bg-amber-500' },
  { id: 'APPOINTMENT', color: 'bg-indigo-600 hover:bg-indigo-500' },
  { id: 'RESERVATION', color: 'bg-purple-600 hover:bg-purple-500' },
  { id: 'CLOSED', color: 'bg-emerald-600 hover:bg-emerald-500' }
];

export const AdhdFocusView: React.FC<AdhdFocusViewProps> = ({
  leads,
  onUpdateLeadStatus,
  onAddNote,
  onSetReminder,
  onSendWhatsApp,
  sendingLeadId
}) => {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newNoteText, setNewNoteText] = useState('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const stageLabels: Record<CrmLeadStatus, string> = {
    CREATED: t('crm.stageCreated', 'New'),
    CONTACTED: t('crm.stageContacted', 'Contacted'),
    FOLLOW_UP: t('crm.stageFollowUp', 'In Follow-up'),
    APPOINTMENT: t('crm.stageAppointment', 'Appointment / Zoom'),
    RESERVATION: t('crm.stageReservation', 'Reservation EOI'),
    CLOSED: t('crm.stageClosed', 'Closed / Won'),
    LOST: t('crm.stageLost', 'Archived')
  };

  if (!leads.length) {
    return (
      <div className="py-16 text-center text-slate-400 font-mono text-sm">
        {t('crm.noLeadsFiltered', 'No prospects found in this filter.')}
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
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 card-3d backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-600">
            {t('crm.lead', 'Lead')} <span className="text-slate-900 font-bold">{currentIndex + 1}</span> {t('crm.of', 'of')}{' '}
            <span className="text-slate-900 font-bold">{leads.length}</span>
          </span>
          <span className="text-xs text-gold-700 font-mono font-bold truncate max-w-[200px]">
            {currentLead.campaign_name || currentLead.campaign_id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title={t('crm.focusPrevBtn', 'Previous Lead')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === leads.length - 1}
            className="p-2 rounded-xl bg-gold-500 text-slate-950 font-bold hover:bg-gold-400 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-md"
            title={t('crm.focusNextBtn', 'Next Lead')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main ADHD Focus Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 card-3d-gold space-y-6 relative overflow-hidden">
        {/* Urgent ADHD Alert Banner if never contacted */}
        {isOverdue && (
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              {t('crm.overdueAlert', '⚡ ADHD Alert: This prospect has not been contacted yet. Take action now!')}
            </span>
          </div>
        )}

        {/* Lead Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-serif-luxury font-bold text-slate-900 flex items-center gap-3">
              <span>{currentLead.name}</span>
              {currentLead.whatsapp_status === 'sent' && (
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-1 rounded-full font-mono font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {t('common.sent', 'Sent')} ({currentLead.last_sent_type || 'manual'})
                </span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono mt-1">
              <a href={`tel:${cleanDigits}`} className="hover:text-gold-700 transition flex items-center gap-1 font-semibold">
                <Phone className="w-3.5 h-3.5 text-gold-600" /> {currentLead.phone}
              </a>
              {currentLead.email && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Mail className="w-3.5 h-3.5" /> {currentLead.email}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 font-mono uppercase">
              {stageLabels[currentLead.crm_status] || currentLead.crm_status}
            </span>
          </div>
        </div>

        {/* Lead Context Data Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 font-mono">{t('crm.objective', 'Objective')}</div>
            <div className="text-slate-900 font-semibold">{currentLead.objective || 'Investment'}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 font-mono">{t('crm.timeline', 'Timeline')}</div>
            <div className="text-slate-900 font-semibold">{currentLead.timeline || 'Upcoming months'}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 font-mono">{t('crm.budget', 'Budget')}</div>
            <div className="text-gold-700 font-bold font-mono">
              {currentLead.budget_eur ? `${currentLead.budget_eur.toLocaleString()} €` : 'To discuss'}
            </div>
          </div>
        </div>

        {/* Historical Notes */}
        {currentLead.notes && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <span className="font-bold font-mono uppercase block text-[10px] text-amber-700 mb-1">
              {t('crm.previousNotes', 'Previous Prospect Notes:')}
            </span>
            {currentLead.notes}
          </div>
        )}

        {/* Personalized AI Message Preview & Send Action */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>{t('crm.waMessageLabel', 'Personalized WhatsApp Message:')}</span>
            {currentLead.last_contact_date && (
              <span className="text-emerald-700 font-semibold">
                {t('crm.lastContact', 'Last contact:')} {currentLead.last_contact_date}
              </span>
            )}
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line max-h-48 overflow-y-auto custom-scrollbar">
            {currentLead.personalized_message || t('crm.noMessageGen', 'No message generated.')}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {/* WhatsApp Send 1-Click */}
            <button
              onClick={() => onSendWhatsApp(currentLead)}
              disabled={sendingLeadId === currentLead.id}
              className="flex-1 max-w-[150px] h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-600/25 active:scale-95 transition-all disabled:opacity-50"
              title="Enviar WhatsApp Oficial"
            >
              {sendingLeadId === currentLead.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
            </button>

            {/* Direct Phone Call */}
            <a
              href={`tel:${cleanDigits}`}
              className="flex-1 max-w-[150px] h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-600/20 transition active:scale-95"
              title="Llamar directamente al lead"
            >
              <Phone className="w-5 h-5" />
            </a>

            {/* Open in WhatsApp Web */}
            <a
              href={waWebLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 max-w-[150px] h-12 bg-slate-100 hover:bg-slate-200 text-emerald-700 border border-slate-200 rounded-2xl flex items-center justify-center transition active:scale-95"
              title="Abrir en WhatsApp Web"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Quick Stage Transition Buttons */}
        <div className="space-y-2 pt-3 border-t border-slate-200">
          <div className="text-[11px] font-mono text-slate-500">{t('crm.oneTapStage', 'Change Stage with 1 Tap:')}</div>
          <div className="flex flex-wrap gap-2">
            {STAGE_KEYS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => onUpdateLeadStatus(currentLead.id, btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-sm ${btn.color} ${
                  currentLead.crm_status === btn.id ? 'ring-2 ring-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                }`}
              >
                {stageLabels[btn.id] || btn.id}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Follow-up Reminders */}
        <div className="space-y-2 pt-2">
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gold-600" /> {t('crm.scheduleReminder', 'Schedule Reminder:')}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSetReminder(currentLead.id, 2)}
              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs text-slate-700 font-mono"
            >
              {t('crm.in2h', 'In 2 Hours')}
            </button>
            <button
              onClick={() => onSetReminder(currentLead.id, 24)}
              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs text-slate-700 font-mono"
            >
              {t('crm.tomorrow24h', 'Tomorrow (24h)')}
            </button>
            <button
              onClick={() => onSetReminder(currentLead.id, 72)}
              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs text-slate-700 font-mono"
            >
              {t('crm.in3d', 'In 3 Days')}
            </button>
          </div>
        </div>

        {/* Add Quick Note */}
        <div className="space-y-2 pt-3 border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNote()}
              placeholder={t('crm.quickNotePlaceholder', 'Type a quick call or follow-up note...')}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-gold-500 font-sans"
            />
            <button
              onClick={submitNote}
              className="px-4 py-2 rounded-xl bg-gold-500 text-slate-950 font-bold text-xs font-mono hover:bg-gold-400 transition"
            >
              {t('common.save', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
