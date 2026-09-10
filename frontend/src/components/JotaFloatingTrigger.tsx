import React from 'react';
import { Sparkles, Mic, Activity } from 'lucide-react';

interface JotaFloatingTriggerProps {
  onClick: () => void;
  isSpeaking?: boolean;
}

export const JotaFloatingTrigger: React.FC<JotaFloatingTriggerProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      title="Abrir Jota Core (Orbe 3D y Voz)"
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 p-1.5 pr-4 rounded-full bg-[#0F0C1B]/95 text-white shadow-2xl border border-primary-500/40 hover:border-primary-500 hover:shadow-primary-500/30 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95"
    >
      {/* 3D Mini Neural Core Pulse */}
      <div className="relative w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-tr from-primary-700 via-primary-500 to-fuchsia-500 shadow-lg ring-2 ring-primary-500/50 overflow-hidden">
        <div className="absolute inset-0 bg-primary-500/40 rounded-full animate-ping" />
        <div className="relative w-5 h-5 rounded-full bg-white/90 shadow-inner flex items-center justify-center">
          <Activity className="w-3 h-3 text-primary-600 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col items-start text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold text-white group-hover:text-primary-400 transition-colors">
            JOTA CORE
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold font-mono">
          <Mic className="w-2.5 h-2.5 text-primary-400" />
          <span>Voz ElevenLabs</span>
        </div>
      </div>

      <div className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center ml-1 group-hover:bg-primary-500 group-hover:text-white transition-colors">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
    </button>
  );
};
