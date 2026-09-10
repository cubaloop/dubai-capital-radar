import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, MicOff, VolumeX, X, RefreshCw, Send, MessageSquare } from 'lucide-react';

interface JotaAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JotaAvatarModal: React.FC<JotaAvatarModalProps> = ({ isOpen, onClose }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [jotaSpeechText, setJotaSpeechText] = useState('¡Hola David! Soy Jota, tu copiloto en Dubai. El radar y la pasarela de WhatsApp están conectados. ¿En qué te ayudo hoy?');
  const [audioVolume, setAudioVolume] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 4200);
    return () => clearInterval(blinkInterval);
  }, [isOpen]);

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

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioVolume(Math.min(1, avg / 55));
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      console.warn('[Jota Audio Analyser] Web Audio setup warning:', err);
    }
  };

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
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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

      if (data.reply) {
        speakText(data.reply);
      }
    } catch (err) {
      setIsThinking(false);
      speakText('David, el sistema de WhatsApp y el CRM están activos.');
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

  const mouthOpenness = isSpeaking ? Math.min(18, audioVolume * 22) : 0;
  const mouthWidthScale = isSpeaking ? 1 + (audioVolume * 0.15) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#28243D] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#3A354C] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#3A354C]/60 bg-slate-50/50 dark:bg-[#201D34]/40">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/10 text-primary-500">
              <Sparkles className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#28243D] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-none">Jota Copilot AI</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-500">
                  ElevenLabs Voice
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Broker Senior Virtual • H.O.M.E Properties Dubai</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-slate-900 via-slate-950 to-[#1a162b] flex items-center justify-center overflow-hidden">
          <div 
            className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
              isSpeaking ? 'opacity-40' : 'opacity-0'
            }`}
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(140, 87, 255, ${0.4 + audioVolume * 0.5}) 0%, transparent 70%)`
            }}
          />

          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-primary-500/30 transition-transform duration-700 ease-out hover:scale-[1.02]">
            <img 
              src="/jota_avatar.jpg" 
              alt="Jota Digital Face"
              className="w-full h-full object-cover object-center select-none"
              style={{
                transform: isSpeaking ? `scale(${1 + audioVolume * 0.02})` : 'scale(1)',
                transition: 'transform 0.08s ease-out'
              }}
            />

            <div 
              className={`absolute top-[28%] left-[26%] right-[26%] h-[18%] pointer-events-none transition-opacity duration-150 ${
                isBlinking ? 'opacity-90' : 'opacity-0'
              }`}
            >
              <div className="w-full h-full bg-[#b8856a]/80 backdrop-blur-[1px] rounded-full" />
            </div>

            {isSpeaking && (
              <div 
                className="absolute pointer-events-none transition-all duration-75 ease-out"
                style={{
                  top: '58.5%',
                  left: '42.5%',
                  width: '15%',
                  height: `${Math.max(2, mouthOpenness)}px`,
                  backgroundColor: '#3b1812',
                  borderRadius: '35% 35% 60% 60%',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8), 0 0 2px rgba(255,255,255,0.2)',
                  transform: `scaleX(${mouthWidthScale})`,
                  opacity: audioVolume > 0.08 ? 0.88 : 0.15
                }}
              />
            )}

            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white">
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-ping' : isListening ? 'bg-amber-400 animate-pulse' : 'bg-primary-400'}`} />
              <span>
                {isSpeaking ? 'Hablando en directo...' : isListening ? 'Escuchando a David...' : isThinking ? 'Analizando...' : 'En línea • Dubai'}
              </span>
            </div>

            {isSpeaking && (
              <button 
                onClick={handleStopSpeaking}
                title="Silenciar a Jota"
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-[#201D34]/80 border-b border-slate-100 dark:border-[#3A354C]/60 min-h-[72px] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 italic leading-relaxed line-clamp-3">
            "{jotaSpeechText}"
          </p>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleUserPrompt('Jota, dame un resumen de los leads de hoy y su estado')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#3A354C]/50 hover:bg-primary-500/10 hover:text-primary-500 dark:text-slate-200 transition-colors border border-transparent hover:border-primary-500/30"
            >
              📊 Resumen de Leads
            </button>
            <button
              onClick={() => handleUserPrompt('Quiero un apartamento de un cuarto por un millón de euros en Dubai')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#3A354C]/50 hover:bg-primary-500/10 hover:text-primary-500 dark:text-slate-200 transition-colors border border-transparent hover:border-primary-500/30"
            >
              🏢 Prueba de Lead (1M €)
            </button>
            <button
              onClick={() => speakText('David, acabo de revisar la pasarela de WhatsApp y la conexión con Baileys se encuentra estable.')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#3A354C]/50 hover:bg-primary-500/10 hover:text-primary-500 dark:text-slate-200 transition-colors border border-transparent hover:border-primary-500/30"
            >
              🔊 Test Voz ElevenLabs
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all shadow-md ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30 scale-105' 
                  : 'bg-primary-500 text-white hover:bg-primary-600 shadow-primary-500/25'
              }`}
              title={isListening ? 'Detener micrófono' : 'Hablar con Jota (Reconocimiento de voz)'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUserPrompt(manualInput);
              }}
              className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-[#201D34] rounded-2xl px-4 py-2 border border-slate-200 dark:border-[#3A354C]"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={isListening ? 'Escuchando tu voz...' : 'O escribe un mensaje para Jota...'}
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || isThinking}
                className="p-2 text-primary-500 disabled:opacity-40 hover:bg-primary-500/10 rounded-xl transition-colors"
              >
                {isThinking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>

          {isListening && (
            <p className="text-xs text-rose-500 font-bold animate-pulse text-center">
              🎙️ Grabando audio... Habla ahora (termina de hablar para enviar a Jota)
            </p>
          )}

          {transcript && (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#201D34]/60 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-primary-500">Transcripción:</span> "{transcript}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
