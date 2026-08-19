import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  ShieldCheck,
  Send
} from 'lucide-react';

interface WhatsAppQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppQRModal: React.FC<WhatsAppQRModalProps> = ({ isOpen, onClose }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testNumber, setTestNumber] = useState<string>('971501378020');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/whatsapp/qr');
      const data = await res.json();
      setIsConnected(data.connected);
      setQrCode(data.qr);
      setPhone(data.phone);
    } catch (err) {
      console.error('Error fetching WhatsApp QR', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      fetchStatus();
    } catch (e) {
      console.error(e);
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
          message: '🏰 [Dubai Capital Radar] Mensaje de prueba: Conexión automática por QR Gateway exitosa.'
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
      <div className="glass-panel-gold max-w-md w-full rounded-3xl p-6 sm:p-8 border border-gold-500/40 relative shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-slate-900 border border-slate-800"
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
              WhatsApp Gateway QR
            </h2>
            <p className="text-xs text-slate-300">
              Vinculación 100% Gratuita y Automática para tu número
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
                El sistema ya puede despachar mensajes y dossiers en piloto automático 24/7 sin límites ni costo por mensaje.
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
          <div className="space-y-4 text-center">
            {qrCode ? (
              <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-xl border-4 border-emerald-500/40">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 mx-auto object-contain" />
              </div>
            ) : (
              <div className="w-56 h-56 mx-auto bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-slate-800 space-y-2">
                <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
                <span className="text-xs text-slate-400">Generando código QR...</span>
              </div>
            )}

            <div className="text-left bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" /> Pasos para escanear:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                <li>Abre <strong>WhatsApp</strong> en tu teléfono.</li>
                <li>Ve a <strong>Ajustes / Configuración ➡️ Dispositivos vinculados</strong>.</li>
                <li>Toca <strong>"Vincular un dispositivo"</strong> y apunta con la cámara a este código QR.</li>
              </ol>
            </div>

            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refrescar QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
