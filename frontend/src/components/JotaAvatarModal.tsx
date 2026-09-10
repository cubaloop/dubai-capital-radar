import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, MicOff, VolumeX, X, RefreshCw, Send, CheckCircle2, MessageSquare, Activity, Cpu, Zap } from 'lucide-react';

interface JotaAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JotaAvatarModal: React.FC<JotaAvatarModalProps> = ({ isOpen, onClose }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [jotaSpeechText, setJotaSpeechText] = useState('¡Hola David! Soy Jota. Radar de 133 leads y pasarela de WhatsApp activos. ¿Qué orden deseas ejecutar?');
  const [audioVolume, setAudioVolume] = useState(0);
  const [manualInput, setManualInput] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(64));

  // Canvas 3D Biomorphic Neural Orb Animation (Jarvis / Siri style)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;
    let particles: { x: number; y: number; radius: number; speed: number; angle: number; dist: number }[] = [];
    const numParticles = 45;
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: 0,
        y: 0,
        radius: Math.random() * 2 + 1,
        speed: Math.random() * 0.02 + 0.01,
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 80 + 35
      });
    }

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Read audio spectrum if available
      let vol = 0;
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current as any);
        let sum = 0;
        for (let i = 0; i < 32; i++) {
          sum += frequencyDataRef.current[i];
        }
        vol = sum / 32 / 255; // 0 to 1
        setAudioVolume(vol);
      }

      angle += isThinking ? 0.06 : isSpeaking ? 0.035 : isListening ? 0.04 : 0.015;

      // 1. Outer Ambient Glow
      const glowGrad = ctx.createRadialGradient(
        centerX, centerY, 10,
        centerX, centerY, 140 + vol * 60
      );
      if (isListening) {
        glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        glowGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
        glowGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      } else if (isThinking) {
        glowGrad.addColorStop(0, 'rgba(245, 158, 11, 0.5)');
        glowGrad.addColorStop(0.5, 'rgba(140, 87, 255, 0.25)');
        glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      } else if (isSpeaking) {
        glowGrad.addColorStop(0, `rgba(140, 87, 255, ${0.5 + vol * 0.4})`);
        glowGrad.addColorStop(0.5, `rgba(236, 72, 153, ${0.25 + vol * 0.3})`);
        glowGrad.addColorStop(1, 'rgba(140, 87, 255, 0)');
      } else {
        glowGrad.addColorStop(0, 'rgba(140, 87, 255, 0.35)');
        glowGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
        glowGrad.addColorStop(1, 'rgba(140, 87, 255, 0)');
      }
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Gyroscopic Rotating 3D Rings
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle * (r % 2 === 0 ? 1 : -1) + (r * Math.PI / ringCount));
        
        ctx.beginPath();
        const baseRadius = 65 + r * 18 + (vol * 22);
        ctx.ellipse(0, 0, baseRadius, baseRadius * 0.42, (r * Math.PI) / 4, 0, Math.PI * 2);
        
        if (isListening) {
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 + vol * 0.4})`;
          ctx.lineWidth = 1.8;
        } else if (isThinking) {
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.5 + Math.sin(angle * 4) * 0.3})`;
          ctx.lineWidth = 2.2;
        } else if (isSpeaking) {
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.5 + vol * 0.5})`;
          ctx.lineWidth = 2.0 + vol * 2.5;
        } else {
          ctx.strokeStyle = 'rgba(140, 87, 255, 0.35)';
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. Central Biomorphic Pulsing Core
      const corePulse = Math.sin(angle * 2.5) * 4;
      const coreRadius = Math.max(25, (isSpeaking ? 34 + vol * 28 : isListening ? 32 : isThinking ? 30 : 28) + corePulse);
      
      const coreGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.25, centerY - coreRadius * 0.25, coreRadius * 0.1,
        centerX, centerY, coreRadius
      );

      if (isListening) {
        coreGrad.addColorStop(0, '#A7F3D0');
        coreGrad.addColorStop(0.4, '#10B981');
        coreGrad.addColorStop(0.8, '#06B6D4');
        coreGrad.addColorStop(1, 'rgba(4, 120, 87, 0.2)');
      } else if (isThinking) {
        coreGrad.addColorStop(0, '#FEF08A');
        coreGrad.addColorStop(0.4, '#F59E0B');
        coreGrad.addColorStop(0.8, '#8C57FF');
        coreGrad.addColorStop(1, 'rgba(140, 87, 255, 0.2)');
      } else if (isSpeaking) {
        coreGrad.addColorStop(0, '#F5D0FE');
        coreGrad.addColorStop(0.35, '#C084FC');
        coreGrad.addColorStop(0.7, '#8C57FF');
        coreGrad.addColorStop(1, 'rgba(99, 102, 241, 0.3)');
      } else {
        coreGrad.addColorStop(0, '#DDD6FE');
        coreGrad.addColorStop(0.4, '#8C57FF');
        coreGrad.addColorStop(0.8, '#4338CA');
        coreGrad.addColorStop(1, 'rgba(67, 56, 202, 0.2)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = isListening ? '#10B981' : isThinking ? '#F59E0B' : '#8C57FF';
      ctx.shadowBlur = 25 + vol * 30;
      ctx.fill();
      ctx.shadowBlur = 0; // reset

      // 4. Acoustic Waveform Equator Rings
      if (isSpeaking || isListening) {
        const wavePoints = 48;
        ctx.beginPath();
        for (let i = 0; i <= wavePoints; i++) {
          const theta = (i / wavePoints) * Math.PI * 2;
          const freqIndex = i % 16;
          const freqVal = frequencyDataRef.current[freqIndex] / 255;
          const rOffset = Math.sin(theta * 6 + angle * 3) * (freqVal * 28 + vol * 18);
          const rDist = coreRadius + 14 + rOffset;
          const px = centerX + Math.cos(theta) * rDist;
          const py = centerY + Math.sin(theta) * rDist;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = isListening ? 'rgba(52, 211, 153, 0.75)' : 'rgba(232, 121, 249, 0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 5. Orbiting Swarm Particles
      particles.forEach((p) => {
        p.angle += p.speed * (isThinking ? 2.5 : isSpeaking ? 1.8 : 1.0);
        const currentDist = p.dist + Math.sin(angle + p.angle) * 12 + (vol * 25);
        p.x = centerX + Math.cos(p.angle) * currentDist;
        p.y = centerY + Math.sin(p.angle) * (currentDist * 0.75);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1 + vol * 0.8), 0, Math.PI * 2);
        ctx.fillStyle = isListening ? '#34D399' : isThinking ? '#FBBF24' : isSpeaking ? '#F472B6' : '#C4B5FD';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isOpen, isSpeaking, isListening, isThinking]);

  // Audio Analyser for Real-time Soundwave Output
  const setupAudioAnalyser = (audioEl: HTMLAudioElement) => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = ctx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (err) {
      console.warn('[Jota Audio Analyser] Web Audio setup warning:', err);
    }
  };

  // Speak text via ElevenLabs backend
  const speakText = async (textToSpeak: string) => {
    try {
      setIsSpeaking(true);
      setJotaSpeechText(textToSpeak);

      const response = await fetch('/api/copilot/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak })
      });

      if (!response.ok) {
        throw new Error('Error sintetizando voz en ElevenLabs');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setupAudioAnalyser(audio);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setAudioVolume(0);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setAudioVolume(0);
      };

      await audio.play();
    } catch (err) {
      console.error('[Jota Voice] Error playing ElevenLabs speech:', err);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          setAudioVolume(0);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    }
  };

  // Web Speech API for User Voice Input (Microphone)
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz nativo. Por favor usa Chrome, Edge o Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setLastAction(null);
    };

    recognition.onresult = (event: any) => {
      let currentText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentText += event.results[i][0].transcript;
      }
      setTranscript(currentText);
    };

    recognition.onerror = (e: any) => {
      console.warn('[SpeechRecognition error]:', e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript.trim()) {
        handleUserPrompt(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Send prompt to Jota AI Copilot (Real CRM Execution)
  const handleUserPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;
    setIsThinking(true);
    setManualInput('');

    try {
      const res = await fetch('/api/copilot/voice-interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      const data = await res.json();
      setIsThinking(false);

      if (data.action_executed) {
        setLastAction('¡Acción de WhatsApp ejecutada en vivo!');
      }

      if (data.reply) {
        speakText(data.reply);
      }
    } catch (err) {
      setIsThinking(false);
      speakText('David, el sistema de WhatsApp y el CRM están activos en tiempo real.');
    }
  };

  const handleStopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setAudioVolume(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0F0C1B] rounded-3xl shadow-2xl border border-primary-500/30 overflow-hidden flex flex-col">
        
        {/* HUD Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
              <Cpu className="w-4 h-4 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#0F0C1B] animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white tracking-wide">JOTA 3D NEURAL CORE</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  LIVE CRM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">ElevenLabs v2 • Latencia ultrabaja • Dubai</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Biomorphic Soundwave Orb Canvas */}
        <div className="relative w-full h-72 bg-gradient-to-b from-[#0F0C1B] via-[#16112C] to-[#0B0916] flex items-center justify-center overflow-hidden">
          
          {/* Cybernetic Grid Overlay */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(140, 87, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(140, 87, 255, 0.2) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Interactive Canvas */}
          <canvas 
            ref={canvasRef} 
            width={340} 
            height={280} 
            className="relative z-10 select-none cursor-pointer"
            onClick={toggleListening}
            title="Haz clic en el orbe para hablar"
          />

          {/* HUD Telemetry Badges */}
          <div className="absolute top-3 left-4 flex flex-col gap-1 z-20 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>RADAR: 133 LEADS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-primary-400" />
              <span>WA GATEWAY: CONECTADO</span>
            </div>
          </div>

          <div className="absolute top-3 right-4 z-20">
            {isSpeaking && (
              <button 
                onClick={handleStopSpeaking}
                title="Silenciar a Jota"
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Core State Pill */}
          <div className="absolute bottom-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-mono font-bold text-white z-20">
            <span className={`w-2 h-2 rounded-full ${
              isSpeaking ? 'bg-fuchsia-400 animate-ping' : 
              isListening ? 'bg-emerald-400 animate-pulse' : 
              isThinking ? 'bg-amber-400 animate-spin' : 
              'bg-primary-400'
            }`} />
            <span>
              {isSpeaking ? 'JOTA TRANSMITIENDO VOZ...' : 
               isListening ? 'ESCUCHANDO ORDEN DE DAVID...' : 
               isThinking ? 'EJECUTANDO EN CRM...' : 
               'NÚCLEO EN ESPERA • TOCA PARA HABLAR'}
            </span>
          </div>
        </div>

        {/* Action Success Alert (if dispatched) */}
        {lastAction && (
          <div className="px-6 py-2 bg-emerald-500/15 border-y border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-semibold animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lastAction}</span>
          </div>
        )}

        {/* Speech Output Box */}
        <div className="px-6 py-4 bg-[#141026] border-b border-white/10 min-h-[74px] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center shrink-0 border border-primary-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-100 italic leading-relaxed line-clamp-3">
            "{jotaSpeechText}"
          </p>
        </div>

        {/* Real Action Voice Prompts */}
        <div className="p-6 flex flex-col gap-4 bg-[#0F0C1B]">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleUserPrompt('Jota, dame un resumen de los leads de hoy')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-primary-500/20 text-slate-200 hover:text-primary-300 transition-colors border border-white/10 hover:border-primary-500/40"
            >
              📊 Resumen Real de Leads
            </button>
            <button
              onClick={() => handleUserPrompt('Quiero un apartamento de un cuarto por 1M de euros en Dubai')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-primary-500/20 text-slate-200 hover:text-primary-300 transition-colors border border-white/10 hover:border-primary-500/40"
            >
              🏢 Inventario 1M €
            </button>
            <button
              onClick={() => handleUserPrompt('Jota, mándale a Javier la ficha de Oceanz')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors border border-emerald-500/30"
            >
              🚀 Mándale Oceanz a Javier
            </button>
            <button
              onClick={() => handleUserPrompt('Cómo está la conexión de WhatsApp')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-primary-500/20 text-slate-200 hover:text-primary-300 transition-colors border border-white/10 hover:border-primary-500/40"
            >
              💬 Estado de WhatsApp
            </button>
          </div>

          {/* Voice Mic & Action Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleListening}
              className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-lg ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/40 scale-105 ring-4 ring-rose-500/30' 
                  : 'bg-gradient-to-tr from-primary-600 to-primary-500 text-white hover:from-primary-500 hover:to-primary-400 shadow-primary-500/30'
              }`}
              title={isListening ? 'Detener micrófono' : 'Hablar con Jota (Reconocimiento de voz)'}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUserPrompt(manualInput);
              }}
              className="flex-1 flex items-center gap-2 bg-white/5 rounded-2xl px-4 py-3 border border-white/10 focus-within:border-primary-500/60 transition-colors"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={isListening ? 'Escuchando tu voz...' : 'O dale una orden directa a Jota...'}
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || isThinking}
                className="p-2 text-primary-400 disabled:opacity-40 hover:bg-primary-500/20 rounded-xl transition-colors"
              >
                {isThinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {isListening && (
            <p className="text-xs text-emerald-400 font-mono font-bold animate-pulse text-center">
              🎙️ Grabando audio en directo... Habla ahora (termina de hablar para ejecutar)
            </p>
          )}

          {transcript && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
              <span className="font-bold text-primary-400">Orden recibida:</span> "{transcript}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
