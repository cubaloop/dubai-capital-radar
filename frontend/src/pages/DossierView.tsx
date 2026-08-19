import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  Calendar, 
  MessageSquare, 
  ArrowLeft, 
  Lock, 
  Check, 
  PieChart, 
  Layers, 
  Sparkles,
  Award,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import { DossierResponse } from '../types';
import { apiService } from '../services/api';

interface DossierViewProps {
  slugOrId: string;
  onBack: () => void;
}

export const DossierView: React.FC<DossierViewProps> = ({ slugOrId, onBack }) => {
  const [dossier, setDossier] = useState<DossierResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [customIncome, setCustomIncome] = useState<number>(500000);
  const [customCapitalGains, setCustomCapitalGains] = useState<number>(2500000);
  const [calculatedSavings, setCalculatedSavings] = useState<{
    homeTax: number;
    annualSavings: number;
    fiveYearSavings: number;
    effectiveRate: number;
  } | null>(null);

  useEffect(() => {
    const fetchDossier = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.getDossier(slugOrId);
        setDossier(data);
        setCustomIncome(data.tax_analysis.annual_income_usd);
        setCustomCapitalGains(data.tax_analysis.capital_gains_usd);
      } catch (err) {
        console.error('Error fetching dossier', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (slugOrId) {
      fetchDossier();
    }
  }, [slugOrId]);

  // Recalculate tax savings dynamically when sliders move
  useEffect(() => {
    if (!dossier) return;
    const compute = async () => {
      try {
        const res = await apiService.getTaxComparison(
          dossier.prospect.country,
          customIncome,
          customCapitalGains
        );
        setCalculatedSavings({
          homeTax: res.home_tax_liability_usd,
          annualSavings: res.annual_tax_savings_usd,
          fiveYearSavings: res.five_year_savings_usd,
          effectiveRate: res.effective_home_tax_rate
        });
      } catch (e) {
        console.error(e);
      }
    };
    compute();
  }, [customIncome, customCapitalGains, dossier]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-gold-500 border-t-transparent animate-spin"></div>
        <p className="text-sm font-serif-luxury text-gold-300">Generando Dossier Patrimonial Confidencial...</p>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-400">No se encontró el dossier solicitado.</p>
        <button onClick={onBack} className="text-gold-400 font-semibold hover:underline">
          Volver al Radar
        </button>
      </div>
    );
  }

  const { prospect, tax_analysis, recommended_projects, investment_thesis_narrative, golden_visa_roadmap, recommended_asset_allocation } = dossier;

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      {/* Top Header & Confidentiality Tag */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Radar de Liquidez
        </button>

        <div className="flex items-center gap-2 text-xs text-gold-400 font-mono bg-gold-950/60 border border-gold-800/60 px-3 py-1 rounded-full">
          <Lock className="w-3.5 h-3.5" /> CONFIDENCIAL • FAMILY OFFICE STRUCTURING
        </div>
      </div>

      {/* Hero Presentation Card */}
      <div className="glass-panel-gold rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-gold-500/30">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gold-500/10 text-gold-300 font-mono text-xs uppercase tracking-widest">
            Tesis de Inversión y Arbitraje Fiscal
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-white tracking-tight leading-tight">
            Estructura Patrimonial & Golden Visa para {prospect.name}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {investment_thesis_narrative}
          </p>
        </div>

        {/* Quick Highlights Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-800">
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-mono uppercase">Ahorro Fiscal a 5 Años</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              ${(calculatedSavings?.fiveYearSavings || tax_analysis.five_year_savings_usd).toLocaleString()} USD
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">vs. Jurisdicción {prospect.country}</div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-mono uppercase">Elegibilidad Golden Visa</div>
            <div className="text-2xl font-bold text-gold-400 mt-1 flex items-center gap-1.5">
              <Award className="w-6 h-6 text-gold-400" /> 10 Años
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Renovable • Familia Incluida</div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-mono uppercase">Protección Soberana</div>
            <div className="text-2xl font-bold text-white mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400" /> 100% Escrow
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dubai Land Department</div>
          </div>
        </div>
      </div>

      {/* Interactive Tax Simulator */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif-luxury font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold-400" /> Simulador Dinámico de Arbitraje Fiscal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ajusta tus parámetros de liquidez para ver la optimización impositiva en tiempo real comparando {prospect.country} vs. Dubái (0% IRPF y 0% Ganancias de Capital).
            </p>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-400 block">Tipo Impositivo Origen</span>
            <span className="text-lg font-bold text-rose-400">
              {calculatedSavings?.effectiveRate || tax_analysis.effective_home_tax_rate}% Efectivo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Ingresos Anuales Brutos:</span>
              <span className="text-gold-400 font-bold">${customIncome.toLocaleString()} USD</span>
            </div>
            <input
              type="range"
              min="100000"
              max="2000000"
              step="50000"
              value={customIncome}
              onChange={(e) => setCustomIncome(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">Ganancia de Capital / Liquidez:</span>
              <span className="text-gold-400 font-bold">${customCapitalGains.toLocaleString()} USD</span>
            </div>
            <input
              type="range"
              min="500000"
              max="15000000"
              step="250000"
              value={customCapitalGains}
              onChange={(e) => setCustomCapitalGains(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
            />
          </div>
        </div>

        {/* Dynamic comparison table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40">
            <div className="text-xs text-rose-300 font-semibold uppercase tracking-wider">Carga Fiscal en {prospect.country}</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              ${(calculatedSavings?.homeTax || tax_analysis.home_tax_liability_usd).toLocaleString()} USD
            </div>
            <p className="text-[11px] text-rose-400/80 mt-1">
              Impuesto sobre la renta + Retención sobre plusvalías y patrimonio.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
            <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Carga Fiscal en Dubái (EAU)</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              $0.00 USD (0% Impuesto Personal)
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">
              100% de retención de capital para reinversión en activos inmobiliarios de alto rendimiento.
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Trophy Assets */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-serif-luxury font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gold-400" /> Cartera Inmobiliaria Asignada (+2M AED Golden Visa)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Activos curados bajo cuenta de custodia oficial de la DLD que satisfacen el umbral de residencia permanente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommended_projects.map((proj) => (
            <div
              key={proj.id}
              className="glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-gold-500/40 transition-all flex flex-col justify-between"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={proj.images[0]}
                  alt={proj.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-gold-300 border border-gold-500/30">
                  {proj.developer}
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-bold text-white font-serif-luxury">{proj.name}</h3>
                    <p className="text-xs text-slate-300">{proj.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-mono">Net Yield</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">+{proj.projected_net_yield}%</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {proj.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block">Precio de Entrada:</span>
                    <span className="font-bold text-white font-mono">AED {proj.starting_price_aed.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">(${proj.starting_price_usd.toLocaleString()} USD)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Plan de Pago:</span>
                    <span className="font-semibold text-slate-200">{proj.payment_plan}</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">DLD Escrow: <strong className="text-slate-200">{proj.dld_escrow_number}</strong></span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Golden Visa Aprobado
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Golden Visa Roadmap */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <h2 className="text-xl font-serif-luxury font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-gold-400" /> Hoja de Ruta de Residencia Golden Visa (21 Días)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {golden_visa_roadmap.map((item, index) => (
            <div key={index} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2 relative">
              <div className="text-xs font-bold text-gold-400 font-mono">{item.timeline}</div>
              <h3 className="font-bold text-sm text-white">{item.step}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Direct VIP Action Hub */}
      <div className="glass-panel-gold rounded-2xl p-8 border border-gold-500/40 text-center space-y-6">
        <h2 className="text-2xl font-serif-luxury font-bold text-white">
          Agendar Sesión Privada de Estructuración Patrimonial
        </h2>
        <p className="text-slate-300 text-sm max-w-xl mx-auto">
          Coordina una sesión confidencial de 15 minutos con nuestro equipo en DIFC para revisar la asignación de unidades y la tramitación directa de tu Golden Visa.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
          <a
            href={dossier.calendly_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-amber-300 hover:from-gold-600 hover:to-gold-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-gold-500/25 transition-all text-sm"
          >
            <Calendar className="w-4 h-4" /> Agendar Briefing Ejecutivo (Zoom)
          </a>

          <a
            href={dossier.whatsapp_direct_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-semibold px-6 py-3.5 rounded-xl border border-emerald-600/40 transition-all text-sm"
          >
            <MessageSquare className="w-4 h-4" /> Contactar por WhatsApp VIP
          </a>

          <a
            href="tel:+971501378020"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-gold-400 font-semibold px-6 py-3.5 rounded-xl border border-gold-500/40 transition-all text-sm"
          >
            <PhoneCall className="w-4 h-4" /> Llamar Directo (+971 50 137 8020)
          </a>
        </div>
      </div>
    </div>
  );
};
