import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  DollarSign, 
  Percent, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  ExternalLink,
  Award
} from 'lucide-react';
import { RealEstateProject } from '../types';
import { apiService } from '../services/api';

export const OffPlanMatcher: React.FC = () => {
  const [projects, setProjects] = useState<RealEstateProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterDeveloper, setFilterDeveloper] = useState<string>('all');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const data = await apiService.getInventory();
        setProjects(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const [cryptoOnly, setCryptoOnly] = useState<boolean>(false);

  const developers = ['all', ...Array.from(new Set(projects.map(p => p.developer)))];

  const filteredProjects = projects.filter(p => {
    if (cryptoOnly && !p.crypto_accepted) return false;
    if (filterDeveloper !== 'all' && p.developer !== filterDeveloper) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-white">
            Catálogo Off-Plan & Matcher de Dubái
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Proyectos de primer nivel protegidos bajo cuenta de custodia oficial de la Dubai Land Department (DLD) con asignación de Golden Visa de 10 años y rieles de liquidación cripto (USDT/BTC/ETH).
          </p>
        </div>

        {/* Developer and Crypto filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCryptoOnly(!cryptoOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              cryptoOnly
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400'
                : 'bg-purple-950/60 text-purple-300 border border-purple-800/60 hover:bg-purple-900/60'
            }`}
          >
            <span>🪙 {cryptoOnly ? 'Mostrando Solo Cripto' : 'Filtrar Cripto-Friendly'}</span>
          </button>

          {developers.map(dev => (
            <button
              key={dev}
              onClick={() => setFilterDeveloper(dev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterDeveloper === dev
                  ? 'bg-gold-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {dev === 'all' ? 'Todos' : dev}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 font-serif-luxury">Cargando inventario de Dubái...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredProjects.map((proj) => (
            <div key={proj.id} className="glass-panel rounded-2xl overflow-hidden border border-slate-800 hover:border-gold-500/40 transition-all flex flex-col justify-between group">
              <div className="relative h-60 overflow-hidden">
                <img
                  src={proj.images[0]}
                  alt={proj.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-gold-300 border border-gold-500/30">
                  {proj.developer}
                </div>
                
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {proj.crypto_accepted && (
                    <div className="bg-purple-950/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-purple-300 border border-purple-500/50 shadow-md">
                      🪙 {proj.supported_cryptos?.join(', ') || 'USDT, BTC'}
                    </div>
                  )}
                  <div className="bg-emerald-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> 10-Yr Visa
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-bold text-white font-serif-luxury">{proj.name}</h3>
                    <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gold-400" /> {proj.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Yield Proyectado</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">+{proj.projected_net_yield}% Neto</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {proj.description}
                </p>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Características Principales:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {proj.key_features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                        <span className="text-[11px]">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Precio de Salida:</span>
                    <span className="font-bold text-white font-mono text-sm">AED {proj.starting_price_aed.toLocaleString()}</span>
                    <span className="text-[11px] text-gold-400/90 block font-mono">(${proj.starting_price_usd.toLocaleString()} USD)</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Estructura de Pagos:</span>
                    <span className="font-semibold text-slate-200 text-xs">{proj.payment_plan}</span>
                    <span className="text-[11px] text-slate-400 block font-mono">Entrega: {proj.completion_date}</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Cuenta Escrow: <strong className="text-slate-200">{proj.dld_escrow_number}</strong></span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-4 h-4" /> 100% Protegido DLD
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
