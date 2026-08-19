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
  Flame
} from 'lucide-react';
import { LiquiditySignal, ProspectProfile } from '../types';
import { apiService } from '../services/api';

interface RadarDashboardProps {
  onOpenDossier: (slug: string) => void;
  onOpenCampaigns: () => void;
}

export const RadarDashboard: React.FC<RadarDashboardProps> = ({
  onOpenDossier,
  onOpenCampaigns
}) => {
  const [signals, setSignals] = useState<LiquiditySignal[]>([]);
  const [prospects, setProspects] = useState<ProspectProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [signalsData, prospectsData] = await Promise.all([
        apiService.getSignals(),
        apiService.getProspects()
      ]);
      setSignals(signalsData);
      setProspects(prospectsData);
    } catch (err) {
      console.error('Error loading radar data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerScan = async () => {
    try {
      setIsScanning(true);
      const newSignal = await apiService.triggerRadarScan();
      setSignals(prev => [newSignal, ...prev]);
      // refresh prospects as it auto-enriches
      const updatedProspects = await apiService.getProspects();
      setProspects(updatedProspects);
    } catch (err) {
      console.error('Failed to trigger scan', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateDossier = async (prospectId: string) => {
    try {
      setActionLoadingId(prospectId);
      const dossier = await apiService.generateDossier(prospectId);
      const updatedProspects = await apiService.getProspects();
      setProspects(updatedProspects);
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
      const updatedProspects = await apiService.getProspects();
      setProspects(updatedProspects);
      onOpenCampaigns();
    } catch (err) {
      console.error('Failed to launch campaign', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getSignalBadge = (type: string) => {
    switch (type) {
      case 'crypto_whale':
        return <span className="bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2.5 py-0.5 rounded-full text-xs font-semibold">🪙 Crypto Whale OTC</span>;
      case 'tech_exit':
        return <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2.5 py-0.5 rounded-full text-xs font-semibold">🚀 M&A Tech Exit</span>;
      case 'tax_reform':
        return <span className="bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2.5 py-0.5 rounded-full text-xs font-semibold">⚖️ Fiscal Reform Outflow</span>;
      case 'venture_funding':
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2.5 py-0.5 rounded-full text-xs font-semibold">💰 Secondary Liquidity</span>;
      default:
        return <span className="bg-blue-950/80 text-blue-300 border border-blue-800/60 px-2.5 py-0.5 rounded-full text-xs font-semibold">🌐 Global HNWI Flight</span>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Quick Metrics */}
      <div className="glass-panel-gold rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-semibold tracking-wide uppercase mb-3">
              <Flame className="w-3.5 h-3.5" /> High-Conviction Capital Signals
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white tracking-tight">
              Sovereign Wealth & Liquidity Infiltration Engine
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mt-1">
              Escaneo algorítmico continuo de eventos de liquidez cripto, ventas de startups M&A y fuga de capital por reformas fiscales en Europa y América para colocación directa en Dubai Real Estate.
            </p>
          </div>

          <button
            onClick={handleTriggerScan}
            disabled={isScanning}
            className="flex items-center gap-2 bg-gradient-to-r from-gold-500 via-gold-400 to-amber-300 hover:from-gold-600 hover:to-gold-400 text-slate-950 font-bold px-5 py-3 rounded-xl shadow-lg shadow-gold-500/25 transition-all transform active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Escaneando Mercados...' : 'Escanear Nuevas Señales'}</span>
          </button>
        </div>

        {/* Real-time stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Liquidez Rastreada</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">$54.6M+ <span className="text-xs text-emerald-400 font-mono">+18%</span></div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Ahorro Fiscal EAU</div>
            <div className="text-xl sm:text-2xl font-bold text-gold-400 mt-1">0% IRPF / CGT</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Prospectos Tier 1</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">{prospects.filter(p => p.tier === 'Tier 1').length} Calificados</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Golden Visa Allocation</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">100% Elegibles</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Liquidity Radar Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-luxury font-bold text-lg text-white flex items-center gap-2">
              <Radar className="w-5 h-5 text-gold-400 animate-pulse" /> Live Capital Signals Feed
            </h2>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
              {signals.length} Eventos detectados
            </span>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {signals.map((sig) => (
              <div 
                key={sig.id}
                className="glass-panel p-4 rounded-xl border border-slate-800 hover:border-gold-500/40 transition-all group relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getSignalBadge(sig.signal_type)}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    hace {Math.floor(Math.random() * 25 + 2)}m
                  </span>
                </div>

                <h3 className="font-semibold text-slate-100 mt-2 text-sm group-hover:text-gold-300 transition-colors">
                  {sig.title}
                </h3>

                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {sig.description}
                </p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400 font-mono">
                      ${(sig.estimated_liquidity_usd / 1000000).toFixed(1)}M USD
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-500" /> {sig.source_country}
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Confianza: {(sig.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Enriched Prospects & Instant Action Matrix */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-luxury font-bold text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-400" /> Enriched HNWI Pipeline & Action Matrix
            </h2>
            <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
              Golden Visa Priority Ready
            </span>
          </div>

          <div className="space-y-4">
            {prospects.map((prosp) => (
              <div
                key={prosp.id}
                className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">
                        {prosp.name}
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        prosp.tier === 'Tier 1'
                          ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}>
                        {prosp.tier} (${(prosp.estimated_net_worth_usd / 1000000).toFixed(1)}M Liquid)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {prosp.role_title} • <span className="text-gold-300 font-medium">{prosp.company_name}</span> ({prosp.country})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {prosp.status === 'contacted' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Campaña Activa
                      </span>
                    ) : (
                      <button
                        onClick={() => handleLaunchCampaign(prosp.id)}
                        disabled={actionLoadingId === prosp.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5 text-gold-400" />
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

                <div className="mt-3 bg-slate-900/90 rounded-lg p-3 border border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Evento de Liquidez: </span>
                    <span className="text-slate-200 font-medium">{prosp.liquidity_event}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gold-400 font-mono font-medium whitespace-nowrap">
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
