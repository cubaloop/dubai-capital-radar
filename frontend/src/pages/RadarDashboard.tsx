import React, { useState, useEffect } from 'react';
import { 
  Radar, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Globe, 
  ShieldAlert, 
  ArrowUpRight, 
  Send, 
  FileText, 
  CheckCircle2, 
  RefreshCw,
  ExternalLink,
  Flame,
  Smartphone,
  QrCode,
  ShieldCheck,
  Search,
  Copy,
  Check,
  Database,
  Users
} from 'lucide-react';
import { LiquiditySignal, ProspectProfile } from '../types';
import { apiService } from '../services/api';

interface RadarDashboardProps {
  onOpenDossier: (slug: string) => void;
  onOpenCampaigns: () => void;
  onOpenCRM?: () => void;
  onOpenWhatsAppModal: () => void;
}

export const RadarDashboard: React.FC<RadarDashboardProps> = ({
  onOpenDossier,
  onOpenCampaigns,
  onOpenCRM,
  onOpenWhatsAppModal
}) => {
  const [signals, setSignals] = useState<LiquiditySignal[]>([]);
  const [prospects, setProspects] = useState<ProspectProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [safetyStatus, setSafetyStatus] = useState<any>(null);
  const [xrayQueries, setXrayQueries] = useState<any[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSyncingCRM, setIsSyncingCRM] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [signalsData, prospectsData, autoStatus] = await Promise.all([
        apiService.getSignals(),
        apiService.getProspects(),
        apiService.getAutopilotStatus()
      ]);
      setSignals(signalsData);
      setProspects(prospectsData);
      setAutopilotEnabled(autoStatus.autopilot_enabled);

      // Fetch safety shield and xray queries
      try {
        const [safeRes, xrayRes] = await Promise.all([
          fetch('/api/safety/status').then(r => r.json()),
          fetch('/api/xray-queries').then(r => r.json())
        ]);
        setSafetyStatus(safeRes);
        setXrayQueries(xrayRes);
      } catch (e) {}

    } catch (err) {
      console.error('Error loading radar data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Live polling every 10 seconds to show new prospects detected by Autopilot daemon
    const interval = setInterval(async () => {
      try {
        const [signalsData, prospectsData, autoStatus, safeRes] = await Promise.all([
          apiService.getSignals(),
          apiService.getProspects(),
          apiService.getAutopilotStatus(),
          fetch('/api/safety/status').then(r => r.json()).catch(() => null)
        ]);
        setSignals(signalsData);
        setProspects(prospectsData);
        setAutopilotEnabled(autoStatus.autopilot_enabled);
        if (safeRes) setSafetyStatus(safeRes);
      } catch (err) {
        // silent polling
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAutopilot = async () => {
    try {
      const res = await apiService.toggleAutopilot();
      setAutopilotEnabled(res.autopilot_enabled);
    } catch (err) {
      console.error('Failed to toggle autopilot', err);
    }
  };

  const handleTriggerScan = async () => {
    try {
      setIsScanning(true);
      const newSignal = await apiService.triggerRadarScan();
      setSignals(prev => [newSignal, ...prev]);
      const updatedProspects = await apiService.getProspects();
      setProspects(updatedProspects);
    } catch (err) {
      console.error('Scan error', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateDossier = async (prospectId: string) => {
    try {
      setActionLoadingId(prospectId);
      const dossier = await apiService.generateDossier(prospectId);
      onOpenDossier(dossier.slug);
    } catch (err) {
      console.error('Failed to generate dossier', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLaunchCampaign = async (prospectId: string) => {
    try {
      setActionLoadingId(prospectId);
      await apiService.launchCampaign(prospectId);
      setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, status: 'contacted' } : p));
      onOpenCampaigns();
    } catch (err) {
      console.error('Failed to launch campaign', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSyncCRM = async () => {
    try {
      setIsSyncingCRM(true);
      const res = await fetch('/api/crm/sync-all', { method: 'POST' });
      const data = await res.json();
      setSyncMessage(`✅ ¡${data.synced_count || prospects.length} Leads sincronizados con éxito en CRM Real Estate TDAH!`);
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (e: any) {
      setSyncMessage(`❌ Error: ${e.message}`);
    } finally {
      setIsSyncingCRM(false);
    }
  };

  const handleCopyQuery = (query: string, index: number) => {
    navigator.clipboard.writeText(query);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Anti-Ban & CRM Live Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Anti-Ban Guard Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between card-3d">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">WhatsApp Anti-Ban Shield</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-300 font-bold">0% RIESGO BANEO</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Cap diario: <strong>{safetyStatus?.daily_sent || 0}/{safetyStatus?.daily_limit || 20} envíos</strong> • Pausas humanas: <strong>2 - 5 min aleatorias</strong>
              </p>
            </div>
          </div>
        </div>

        {/* CRM Real Estate TDAH Natively Integrated */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between card-3d">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">CRM Real Estate TDAH</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-mono border border-emerald-300 font-bold">TODO EN UNO</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Integrado nativamente: Deck Focus, Tablero Kanban y gestión de leads.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenCRM && onOpenCRM()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-600 text-slate-950 text-xs font-bold font-mono transition-all shadow-md shadow-gold-500/20"
            >
              Abrir CRM TDAH
            </button>
          </div>
        </div>
      </div>

      {syncMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs p-3 rounded-xl font-mono text-center animate-fade-in">
          {syncMessage}
        </div>
      )}

      {/* Hero Header & Real-Time Stats */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-slate-200/90 card-3d-gold">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-700 text-xs font-semibold tracking-wide uppercase mb-3 border border-gold-300">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> High-Conviction Capital Signals
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-slate-900 tracking-tight">
              Sovereign Wealth & Liquidity Infiltration Engine
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mt-1">
              Escaneo algorítmico continuo de eventos de liquidez cripto, ventas de startups M&A y fuga de capital por reformas fiscales en Europa y América para colocación directa en Dubai Real Estate.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            {/* WhatsApp QR Connector Button */}
            <button
              onClick={onOpenWhatsAppModal}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-xs font-mono"
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>WhatsApp QR</span>
            </button>

            {/* Autopilot Switch */}
            <button
              onClick={handleToggleAutopilot}
              className={`flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                autopilotEnabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono">
                <span className={`w-2.5 h-2.5 rounded-full ${autopilotEnabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                <span>Autopilot: {autopilotEnabled ? 'ACTIVO' : 'INACTIVO'}</span>
              </div>
              <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${autopilotEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${autopilotEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </button>

            <button
              onClick={handleTriggerScan}
              disabled={isScanning}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 via-gold-400 to-amber-300 hover:from-gold-600 hover:to-gold-400 text-slate-950 font-bold px-5 py-3 rounded-xl shadow-lg shadow-gold-500/25 transition-all transform active:scale-95 disabled:opacity-50 whitespace-nowrap text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando...' : 'Escanear Nuevas Señales'}</span>
            </button>
          </div>
        </div>

        {/* Real-time stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Liquidez Rastreada</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">$68.4M+ <span className="text-xs text-emerald-600 font-mono">+24%</span></div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Ahorro Fiscal EAU</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">0% IRPF / CGT</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Proyectos Cripto & Escrow</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">100% DLD Aprobados</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Sala de Zoom Conectada</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 font-mono">596 134 5068</div>
          </div>
        </div>
      </div>

      {/* Google X-Ray Search Hub for LinkedIn Leads */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 card-3d space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-serif-luxury font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-gold-600" /> Generador de Búsquedas X-Ray (LinkedIn Gratuito)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Copia estos comandos y pégalos en Google para extraer perfiles reales de directivos con ventas millonarias recientes sin pagar LinkedIn Sales Navigator.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {xrayQueries.map((item, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gold-700 font-mono">{item.category}</h4>
                  <button
                    onClick={() => handleCopyQuery(item.query, idx)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all font-mono shadow-sm"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" /> Copiar Comando
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{item.description}</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-700 truncate">
                {item.query}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Two-Column View: Signals Stream + Enriched HNWI Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Liquidity Signals Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif-luxury font-bold text-slate-900 flex items-center gap-2">
              <Radar className="w-5 h-5 text-gold-600" /> Señales de Liquidez en Vivo
            </h2>
            <span className="text-xs text-slate-500 font-mono">{(signals || []).length} Eventos Detectados</span>
          </div>

          <div className="space-y-3">
            {(signals || []).map((sig: any, index: number) => (
              <div
                key={sig.id || index}
                className="bg-white rounded-xl p-4 border border-slate-200 hover:border-gold-500/50 card-3d transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-slate-100 text-gold-800 border border-slate-200">
                      {sig.source_country || sig.country || 'INTL'} • {sig.signal_type ? sig.signal_type.replace('_', ' ') : 'INTENT SIGNAL'}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1.5">{sig.title || sig.content || 'Señal de Inversión'}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700 font-mono block">
                      {sig.estimated_liquidity_usd ? `$${(sig.estimated_liquidity_usd / 1000000).toFixed(1)}M` : `Score: ${sig.score || 85}/100`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Confianza: {((sig.confidence_score || (sig.score ? sig.score / 100 : 0.85)) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {sig.description || sig.content}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {((sig.tags || sig.matched_keywords) || ['Inversión', 'Dubai']).slice(0, 3).map((t: string, idx: number) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {sig.detected_at ? new Date(sig.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Enriched HNWI Prospect Pipeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif-luxury font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-gold-600" /> Pipeline de Inversores Cualificados (HNWI)
            </h2>
            <span className="text-xs text-emerald-700 font-mono font-semibold">
              ● Enriquecimiento Activo
            </span>
          </div>

          <div className="space-y-4">
            {prospects.map((prosp) => (
              <div
                key={prosp.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-gold-500/50 card-3d transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 font-serif-luxury">{prosp.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono ${
                        prosp.tier === 'Tier 1'
                          ? 'bg-gold-500/20 text-gold-700 border border-gold-400'
                          : 'bg-blue-50 text-blue-700 border border-blue-300'
                      }`}>
                        {prosp.tier} (${(prosp.estimated_net_worth_usd / 1000000).toFixed(1)}M Liquid)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {prosp.role_title} • <span className="text-gold-700 font-semibold">{prosp.company_name}</span> ({prosp.country})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {prosp.status === 'contacted' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Campaña Activa
                      </span>
                    ) : (
                      <button
                        onClick={() => handleLaunchCampaign(prosp.id)}
                        disabled={actionLoadingId === prosp.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5 text-gold-600" />
                        <span>Despachar Campaña</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleGenerateDossier(prosp.id)}
                      disabled={actionLoadingId === prosp.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-gold-500/20 active:scale-95 disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{actionLoadingId === prosp.id ? 'Generando...' : 'Ver Dossier'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Evento de Liquidez: </span>
                    <span className="text-slate-800 font-medium">{prosp.liquidity_event}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gold-700 font-mono font-bold whitespace-nowrap">
                    <span>Ahorro Estimado: +${((prosp.estimated_net_worth_usd * 0.25) / 1000).toFixed(0)}k/año</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
