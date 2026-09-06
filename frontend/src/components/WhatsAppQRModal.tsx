import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  Send,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface WhatsAppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppQRModal: React.FC<WhatsAppQRModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'pairing'>('qr');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(25);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);

  // Pairing Code state
  const [pairingPhone, setPairingPhone] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState<boolean>(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Test Message state
  const [testNumber, setTestNumber] = useState<string>('971501378020');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/qr');
      const data = await res.json();
      setIsConnected(data.connected);
      setQrCode(data.qr);
      setPhone(data.phone);
      if (typeof data.expires_in_seconds === 'number' && data.expires_in_seconds > 0) {
        setExpiresIn(data.expires_in_seconds);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp QR', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll status while open
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Local second countdown for QR freshness
  useEffect(() => {
    if (!isOpen || isConnected) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => (prev > 1 ? prev - 1 : 25));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isConnected]);

  // Force clean restart of gateway
  const handleRestart = async () => {
    try {
      setIsRestarting(true);
      setQrCode(null);
      setPairingCode(null);
      setPairingError(null);
      await fetch('/api/whatsapp/restart', { method: 'POST' });
      setExpiresIn(25);
      setTimeout(fetchStatus, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRestarting(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsRestarting(true);
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      setTimeout(fetchStatus, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRestarting(false);
    }
  };

  // Request 8-digit Pairing Code
  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pairingPhone.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 8) {
      setPairingError('Por favor ingresa tu número completo con prefijo internacional (ej. 34 para España, 971 para UAE, 52 para México).');
      return;
    }

    try {
      setPairingLoading(true);
      setPairingError(null);
      const res = await fetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean })
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairingCode(data.code);
      } else {
        setPairingError(data.error || 'No se pudo generar el código. Intenta de nuevo.');
      }
    } catch (err: any) {
      setPairingError(`Error al conectar con la pasarela: ${err.message}`);
    } finally {
      setPairingLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode.replace('-', ''));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  const handleSendTest = async () => {
    try {
      setTestStatus('Enviando mensaje de prueba...');
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testNumber,
          message: '🏰 [Dubai Capital Radar] Mensaje de prueba: Conexión automática por WhatsApp Gateway exitosa.'
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus('✅ ¡Mensaje de prueba enviado con éxito a tu WhatsApp!');
      } else {
        setTestStatus(`⚠️ ${data.error || 'No se pudo enviar el mensaje'}`);
      }
    } catch (err: any) {
      setTestStatus(`❌ Error: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="glass-panel-gold max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-gold-500/40 relative shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif-luxury font-bold text-lg text-white">
              Vincular WhatsApp Gateway
            </h2>
            <p className="text-xs text-slate-300">
              Conexión directa 100% gratuita para envíos de campañas y CRM
            </p>
          </div>
        </div>

        {/* Connected State */}
        {isConnected ? (
          <div className="space-y-5">
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-5 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-white text-base">
                WhatsApp Vinculado con Éxito
              </h3>
              <p className="text-xs text-emerald-300 font-mono">
                Número Conectado: <strong>+{phone || 'Registrado'}</strong>
              </p>
              <p className="text-[11px] text-slate-400">
                El sistema ya puede despachar mensajes y dossiers en piloto automático 24/7 sin límites.
              </p>
            </div>

            {/* Test message box */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
              <label className="text-xs text-slate-400 block font-semibold">Probar Envío a tu Número:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white flex-1 focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="34600123456"
                />
                <button
                  onClick={handleSendTest}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar
                </button>
              </div>
              {testStatus && (
                <div className="text-[11px] text-slate-300 font-mono">{testStatus}</div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleLogout}
                disabled={isRestarting}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Desvincular Cuenta
              </button>

              <button
                onClick={onClose}
                className="bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs font-mono uppercase"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          /* Disconnected State - Two Tabs (QR Scan or Phone Pairing Code) */
          <div className="space-y-5">
            {/* Tab Navigation */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`py-2 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition ${
                  activeTab === 'qr'
                    ? 'bg-gold-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>1. Escanear QR</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pairing')}
                className={`py-2 text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 transition ${
                  activeTab === 'pairing'
                    ? 'bg-gold-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>2. Código de 8 Dígitos</span>
              </button>
            </div>

            {/* TAB 1: QR Code Scanner */}
            {activeTab === 'qr' && (
              <div className="space-y-4 text-center">
                {qrCode ? (
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-2xl inline-block mx-auto shadow-2xl border-4 border-emerald-500/40">
                      <img
                        src={qrCode}
                        alt="WhatsApp QR Code"
                        className="w-56 h-56 mx-auto object-contain block"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-emerald-400">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Código activo (Renovación automática cada 25s)</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-56 h-56 mx-auto bg-slate-950 rounded-2xl flex flex-col items-center justify-center border border-slate-800 space-y-3">
                    <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
                    <span className="text-xs text-slate-400 font-mono">Generando QR fresco...</span>
                  </div>
                )}

                {/* Clear Step-by-Step Warnings to avoid "QR no válido" error */}
                <div className="text-left bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>¿Cómo escanearlo correctamente en tu móvil?</span>
                  </div>

                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                    <li>
                      Abre la app de <strong>WhatsApp</strong> en tu teléfono.
                    </li>
                    <li>
                      Toca <strong>Ajustes / Configuración</strong> (o los 3 puntos) ➡️ <strong>Dispositivos vinculados</strong>.
                    </li>
                    <li>
                      Toca <strong>"Vincular un dispositivo"</strong> y apunta al código de arriba.
                    </li>
                  </ol>

                  <div className="text-[10px] text-amber-300/90 bg-amber-950/40 p-2 rounded-xl border border-amber-800/40">
                    💡 <em>Nota importante:</em> No uses la cámara normal de fotos de tu teléfono; debes hacerlo exclusivamente desde dentro de WhatsApp.
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleRestart}
                    disabled={isRestarting || isLoading}
                    className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 font-mono font-bold px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
                    <span>Generar Nuevo QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('pairing')}
                    className="text-xs text-slate-300 hover:text-white underline font-mono"
                  >
                    ¿Problemas con la cámara? Usa código ➔
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Pairing Code (No Camera / 8-Digit Code) */}
            {activeTab === 'pairing' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-gold-400" />
                    <span>Vinculación por Código de 8 Dígitos (Sin Cámara)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Si tu cámara no detecta el QR o la pantalla tiene reflejos, vincula tu WhatsApp directamente escribiendo un código de 8 dígitos en tu teléfono.
                  </p>
                </div>

                {pairingError && (
                  <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-600 text-rose-200 text-xs font-mono">
                    {pairingError}
                  </div>
                )}

                {!pairingCode ? (
                  <form onSubmit={handleRequestPairingCode} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300 font-mono block">
                        Tu Número de WhatsApp (con prefijo del país):
                      </label>
                      <input
                        type="text"
                        required
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        placeholder="Ej: 34612345678 o 971501234567"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 text-sm font-mono"
                      />
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Ejemplo para España: 34600112233 • Ejemplo para UAE: 971501234567
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={pairingLoading}
                      className="w-full bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-400 text-slate-950 font-black py-3 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {pairingLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Obteniendo Código de WhatsApp...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          <span>Obtener Código de 8 Dígitos</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4 animate-fade-in text-center">
                    <div className="bg-slate-950 p-6 rounded-2xl border-2 border-gold-500 space-y-2 shadow-xl">
                      <span className="text-xs font-mono text-gold-400 block uppercase">Tu Código de Vinculación:</span>
                      <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-widest selection:bg-gold-500">
                        {pairingCode}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono transition mt-2"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? '¡Copiado!' : 'Copiar código'}</span>
                      </button>
                    </div>

                    <div className="text-left bg-slate-900/90 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                      <div className="font-bold text-white text-xs">Instrucciones en tu WhatsApp:</div>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                        <li>Abre WhatsApp en tu teléfono ➡️ <strong>Dispositivos vinculados</strong>.</li>
                        <li>Toca <strong>Vincular un dispositivo</strong>.</li>
                        <li>
                          En la parte inferior de la pantalla de escaneo, toca la opción:{' '}
                          <strong className="text-emerald-400">"Vincular con el número de teléfono"</strong>.
                        </li>
                        <li>Escribe este código de 8 dígitos en la pantalla de tu móvil.</li>
                      </ol>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPairingCode(null);
                        setPairingPhone('');
                      }}
                      className="text-xs text-slate-400 hover:text-white font-mono underline"
                    >
                      Generar otro código con otro número
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
