import React from 'react';
import { Sparkles, Mic } from 'lucide-react';

interface JotaFloatingTriggerProps {
  onClick: () => void;
  isSpeaking?: boolean;
}

export const JotaFloatingTrigger: React.FC<JotaFloatingTriggerProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      title="Hablar con Jota Copiloto IA"
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 p-1.5 pr-4 rounded-full bg-white/95 dark:bg-[#28243D]/95 shadow-xl border border-primary-500/30 hover:border-primary-500 hover:shadow-primary-500/25 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95"
    >
      <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-primary-500 shadow-md">
        <img
          src="/jota_avatar.jpg"
          alt="Jota AI"
          className="w-full h-full object-cover select-none"
        />
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#28243D] animate-pulse" />
      </div>
      <div className="flex flex-col items-start text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors">
            Jota AI
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
          <Mic className="w-2.5 h-2.5 text-primary-500" />
          <span>Voz ElevenLabs</span>
        </div>
      </div>
      <div className="w-7 h-7 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center ml-1 group-hover:bg-primary-500 group-hover:text-white transition-colors">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
    </button>
  );
};
