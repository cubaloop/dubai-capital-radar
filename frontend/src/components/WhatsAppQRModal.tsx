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
  Loader2,
  AlertCircle
} from 'lucide-react';

interface WhatsAppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppQRModal: React.FC<WhatsAppQRModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'pairing'>('qr');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [testNumber, setTestNumber] = useState<string>('971501378020');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Pairing code state
  const [pairingPhone, setPairingPhone] = useState<string>('971501378020');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairingLoading, setIsPairingLoading] = useState<boolean>(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Silent background fetch to prevent DOM/image flickering
  const fetchStatus = async (isManual = false) => {
    try {
      if (isManual) setIsManualRefreshing(true);
      const res = await fetch('/api/whatsapp/qr');
      const data = await res.json();
      setIsConnected(data.connected);
      if (data.qr && data.qr !== qrCode) {
        setQrCode(data.qr);
      }
      setPhone(data.phone);
    } catch (err) {
      console.error('Error fetching WhatsApp QR', err);
    } finally {
      if (isManual) setIsManualRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus(false);
      const interval = setInterval(() => fetchStatus(false), 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      setIsManualRefreshing(true);
      setQrCode(null);
      setPairingCode(null);
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      setTimeout(() => fetchStatus(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleRequestPairingCode = async () => {
    if (!pairingPhone.trim()) {
      setPairingError('Ingresa tu número de teléfono con código de país.');
      return;
    }
    try {
      setIsPairingLoading(true);
      setPairingError(null);
      setPairingCode(null);
      const res = await fetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pairingPhone.trim() })
      });
      const data = await res.json();
      if (data.success && data.code) {
        setPairingCode(data.code);
      } else {
        setPairingError(data.error || 'No se pudo generar el código. Intenta de nuevo.');
      }
    } catch (err: any) {
      setPairingError(err.message || 'Error de conexión con el gateway.');
    } finally {
      setIsPairingLoading(false);
    }
  };

  const handleCopyPairingCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace(/-/g, ''));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="glass-panel-gold max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-gold-500/40 relative shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-900 border border-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif-luxury font-bold text-lg text-white">
              Vincular WhatsApp Gateway
            </h2>
            <p className="text-xs text-slate-300">
              Despacho automático de mensajes 24/7 sin costo
            </p>
          </div>
        </div>

        {/* Content */}
        {isConnected ? (
          <div className="space-y-5">
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-5 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-white text-base">
                WhatsApp Vinculado con Éxito
              </h3>
              <p className="text-xs text-emerald-300 font-mono">
                Número Conectado: <strong>+{phone || '971501378020'}</strong>
              </p>
              <p className="text-[11px] text-slate-400">
                El sistema ya puede despachar mensajes y dossiers en piloto automático sin límites.
              </p>
            </div>

            {/* Test message box */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs text-slate-400 block font-semibold">Probar Envío a tu Número:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white flex-1 focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="971501378020"
                />
                <button
                  onClick={handleSendTest}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1 transition-all"
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
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Desvincular Cuenta
              </button>

              <button
                onClick={onClose}
                className="bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Method Tabs */}
            <div className="flex p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'qr'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" /> Escanear QR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pairing')}
                className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'pairing'
                    ? 'bg-gold-500 text-slate-950 shadow-md shadow-gold-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-4 h-4" /> Código de 8 Dígitos (Sin Cámara)
              </button>
            </div>

            {/* TAB 1: QR CODE */}
            {activeTab === 'qr' && (
              <div className="space-y-4 text-center">
                {qrCode ? (
                  <div className="bg-white p-5 rounded-2xl inline-block mx-auto shadow-2xl">
                    <img 
                      src={qrCode} 
                      alt="WhatsApp QR Code" 
                      className="w-64 h-64 mx-auto object-contain block"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 mx-auto bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-slate-800 space-y-2">
                    <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
                    <span className="text-xs text-slate-400">Generando código QR nítido...</span>
                  </div>
                )}

                <div className="text-left bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Pasos para escanear:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                    <li>Abre <strong>WhatsApp</strong> en tu teléfono.</li>
                    <li>Ve a <strong>Ajustes / Configuración ➡️ Dispositivos vinculados</strong>.</li>
                    <li>Toca <strong>"Vincular un dispositivo"</strong> y apunta con la cámara al código QR.</li>
                  </ol>
                  <p className="text-[10px] text-gold-400/90 pt-1">
                    💡 Si tu cámara muestra "No se detectó ningún código QR válido", usa la pestaña superior <strong>"Código de 8 Dígitos"</strong> para vincular al instante sin cámara.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => fetchStatus(true)}
                    disabled={isManualRefreshing}
                    className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isManualRefreshing ? 'animate-spin' : ''}`} /> Refrescar QR
                  </button>

                  <button
                    onClick={handleLogout}
                    disabled={isManualRefreshing}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold"
                    title="Borra tokens viejos y crea un QR 100% nuevo"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Generar Nuevo QR Limpio
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PAIRING CODE (NO CAMERA NEEDED) */}
            {activeTab === 'pairing' && (
              <div className="space-y-4">
                <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <label className="text-xs text-slate-300 block font-semibold">
                    Tu número de WhatsApp (con prefijo de país, sin +):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      placeholder="971501378020"
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white flex-1 focus:outline-none focus:border-gold-500 font-mono"
                    />
                    <button
                      onClick={handleRequestPairingCode}
                      disabled={isPairingLoading}
                      className="bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isPairingLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generando...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Obtener Código</span>
                        </>
                      )}
                    </button>
                  </div>

                  {pairingError && (
                    <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pairingError}</span>
                    </div>
                  )}

                  {pairingCode && (
                    <div className="bg-emerald-950/50 border-2 border-emerald-500/60 p-5 rounded-2xl text-center space-y-3 animate-fade-in">
                      <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                        Código de Vinculación de WhatsApp
                      </div>
                      <div className="text-3xl font-mono font-extrabold text-white tracking-widest bg-slate-950/80 py-3 px-4 rounded-xl border border-emerald-500/30 inline-block select-all">
                        {pairingCode}
                      </div>
                      <div>
                        <button
                          onClick={handleCopyPairingCode}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
                        >
                          {copiedCode ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Código</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-gold-400" /> Pasos en tu teléfono (sin usar la cámara):
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                    <li>Abre <strong>WhatsApp</strong> en tu teléfono.</li>
                    <li>Ve a <strong>Ajustes / Configuración ➡️ Dispositivos vinculados</strong>.</li>
                    <li>Toca <strong>"Vincular un dispositivo"</strong>.</li>
                    <li>
                      Abajo en la pantalla del teléfono, toca la opción:{' '}
                      <strong className="text-gold-400">"Vincular con el número de teléfono"</strong> (o "Vincular con código").
                    </li>
                    <li>Ingresa el código de 8 dígitos generado arriba.</li>
                  </ol>
                  <p className="text-[11px] text-emerald-400/90 pt-1">
                    ✨ Al ingresar el código en tu teléfono, esta ventana se vinculará automáticamente.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
