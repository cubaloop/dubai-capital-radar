import React, { useState, useEffect } from 'react';
import { Building2, X, Check, Shield, Sparkles, Smartphone, Bot, UserCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId?: string;
  agencyName?: string;
  userEmail?: string;
}

export interface AgencyConfig {
  agencyName: string;
  adminPhone: string;
  botPhone: string;
  botName: string;
  businessNiche: string;
  aiInstructions: string;
  targetMarket: string;
  currency: string;
}

const STORAGE_KEY = 'dcr_agency_config';

export const getStoredAgencyConfig = (): AgencyConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {
    agencyName: 'H.O.M.E Properties / Dubai Capital Radar',
    adminPhone: '+971 50 837 9080',
    botPhone: '+971 50 137 8020',
    botName: 'Jota',
    businessNiche: 'Inversiones Inmobiliarias & Real Estate en Dubái',
    aiInstructions: 'Atender inversores interesados en proyectos de alta rentabilidad en Dubái y agendar citas privadas.',
    targetMarket: 'Dubai (Downtown, Palm, Hills)',
    currency: 'USD ($)'
  };
};

export const AgencySettingsModal: React.FC<AgencyModalProps> = ({
  isOpen,
  onClose,
  agencyId,
  agencyName: propAgencyName,
  userEmail
}) => {
  const { t } = useLanguage();
  const activeAgencyId = agencyId || localStorage.getItem('agency_id') || 'agency_master';
  
  const [config, setConfig] = useState<AgencyConfig>(getStoredAgencyConfig());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load from database on modal open
  useEffect(() => {
    if (!isOpen) return;
    setSaved(false);
    setErrorMsg(null);

    const fetchAgencyData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/agencies/${encodeURIComponent(activeAgencyId)}`);
        const data = await res.json();
        if (data.success && data.agency) {
          const a = data.agency;
          setConfig((prev) => ({
            ...prev,
            agencyName: a.name || propAgencyName || prev.agencyName,
            adminPhone: a.admin_phone || prev.adminPhone || '',
            botPhone: a.bot_phone || prev.botPhone || '',
            botName: a.bot_name || 'Jota',
            businessNiche: a.business_niche || (activeAgencyId.includes('surprise') ? 'Agencia Receptiva de Turismo de Lujo y Safaris en Dubái' : prev.businessNiche),
            aiInstructions: a.ai_instructions || (activeAgencyId.includes('surprise') ? 'Surprise Tourism es 100% turismo y experiencias de viaje en Dubái. NO hablar de Real Estate ni venta de propiedades.' : prev.aiInstructions)
          }));
        }
      } catch (err) {
        console.error('Failed to load agency config from server:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgencyData();
  }, [isOpen, activeAgencyId, propAgencyName]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setErrorMsg(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      const res = await fetch(`/api/agencies/${encodeURIComponent(activeAgencyId)}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.agencyName,
          admin_phone: config.adminPhone,
          bot_phone: config.botPhone,
          bot_name: config.botName || 'Jota',
          business_niche: config.businessNiche,
          ai_instructions: config.aiInstructions
        })
      });

      if (!res.ok) {
        throw new Error('Error al sincronizar con el servidor.');
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error guardando ajustes');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-luxury font-bold text-base text-gold-200">
                  Configuración de Empresa & WhatsApp Copilot
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  {activeAgencyId}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                Personaliza de forma independiente el Número Admin, Número de Jota y el comportamiento de la IA para tu empresa.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Nombre Comercial de la Empresa */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gold-600" />
              Nombre Comercial de la Empresa
            </label>
            <input
              type="text"
              value={config.agencyName}
              onChange={(e) => setConfig({ ...config, agencyName: e.target.value })}
              placeholder="Ej: Surprise Tourism LLC o H.O.M.E Properties"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-slate-900 font-medium"
            />
          </div>

          {/* Números de WhatsApp: Admin & Jota */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Teléfonos de WhatsApp para esta Empresa
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Número Admin */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Número Admin (Tú / Gerente)
                </label>
                <input
                  type="text"
                  value={config.adminPhone}
                  onChange={(e) => setConfig({ ...config, adminPhone: e.target.value })}
                  placeholder="+971508379080 o +971564317976"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-900 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Desde este número le das órdenes a Jota y recibes reportes ejecutivos y alertas de leads calificados.
                </p>
              </div>

              {/* Número de Jota */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
                  Número de Jota (WhatsApp del Bot)
                </label>
                <input
                  type="text"
                  value={config.botPhone}
                  onChange={(e) => setConfig({ ...config, botPhone: e.target.value })}
                  placeholder="+971501378020 o +971545932205"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Número que utiliza el sistema para enviar campañas y recibir mensajes de clientes. Se auto-sincroniza al escanear QR.
                </p>
              </div>
            </div>
          </div>

          {/* Nicho de Mercado y Nombre del Copiloto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Nicho / Industria del Negocio
              </label>
              <input
                type="text"
                value={config.businessNiche}
                onChange={(e) => setConfig({ ...config, businessNiche: e.target.value })}
                placeholder="Ej: Turismo de Lujo y Safaris en Dubái, Real Estate, Salud, etc."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Nombre del Copiloto IA
              </label>
              <input
                type="text"
                value={config.botName}
                onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                placeholder="Jota"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-slate-900 font-bold"
              />
            </div>
          </div>

          {/* Instrucciones y Personalización de Jota para esta Empresa */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Instrucciones & Reglas Personalizadas para {config.botName || 'Jota'}</span>
              <span className="text-[10px] font-normal text-slate-500">Exclusivas para esta cuenta</span>
            </label>
            <textarea
              rows={3}
              value={config.aiInstructions}
              onChange={(e) => setConfig({ ...config, aiInstructions: e.target.value })}
              placeholder="Indica las reglas de tu negocio, productos o servicios que ofrece, precios orientativos o restricciones (Ej: Nunca mencionar real estate, ofrecer safari con cena VIP, etc.)"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none text-slate-900 font-sans"
            />
          </div>

          {/* Aislamiento y Seguridad */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-950">
              <span className="font-bold">Aislamiento Total Multi-Tenant:</span> Los números y reglas configurados aquí pertenecen exclusivamente a esta empresa y no afectarán a ninguna otra cuenta registrada en la plataforma.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saved || isLoading}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-gold-500 hover:bg-gold-600 text-slate-950 shadow-md shadow-gold-500/20'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" /> Guardado y Sincronizado
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Guardar Ajustes de Empresa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
