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
import { useLanguage } from '../i18n/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

const DEFAULT_PROJECTS: RealEstateProject[] = [
  {
    id: "proj-damac-chelsea-maritime",
    name: "Chelsea Residences by DAMAC",
    developer: "DAMAC Properties",
    location: "Dubai Maritime City",
    starting_price_aed: 2100000.0,
    starting_price_usd: 571817.0,
    completion_date: "Q4 2027",
    project_type: "Luxury Waterfront Branded Residence",
    projected_net_yield: 8.8,
    five_year_capital_gain: 44.5,
    payment_plan: "70/30 (20% Down / 50% Construction / 30% Handover)",
    dld_escrow_number: "DLD-ESC-2024-5519",
    golden_visa_eligible: true,
    crypto_accepted: true,
    supported_cryptos: ["USDT", "BTC", "ETH"],
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    key_features: [
      "Direct Arabian Gulf & Marina Views",
      "Direct Crypto-to-Escrow Settlements (USDT / BTC)",
      "Instant 10-Year Renewable UAE Golden Visa",
      "VARA & DLD Regulated Escrow Account"
    ],
    description: "DAMAC signature coastal development in Dubai Maritime City. Full VARA-compliant cryptocurrency payment rails allowing seamless off-ramp directly into DLD escrow."
  },
  {
    id: "proj-binghatti-bugatti-residences",
    name: "Bugatti Residences by Binghatti",
    developer: "Binghatti Developers",
    location: "Business Bay / Downtown Canal",
    starting_price_aed: 19500000.0,
    starting_price_usd: 5309734.0,
    completion_date: "Q4 2026",
    project_type: "Ultra-Luxury Automotive Branded Sky Mansion",
    projected_net_yield: 8.2,
    five_year_capital_gain: 52.0,
    payment_plan: "70/30 Linked Construction Plan",
    dld_escrow_number: "DLD-ESC-2023-9021",
    golden_visa_eligible: true,
    crypto_accepted: true,
    supported_cryptos: ["USDT", "BTC", "ETH", "SOL"],
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    key_features: [
      "Private Car Elevator to High-Floor Sky Mansions",
      "Riviera-Inspired Private Beach in Business Bay",
      "Pioneer Developer with Official Crypto Payment",
      "Golden Visa & Private Family Office Structuring"
    ],
    description: "The world's first Bugatti branded residence. Designed specifically for crypto founders and global tech leaders desiring iconic engineering and private elevators."
  },
  {
    id: "proj-sobha-seahaven-harbour",
    name: "Sobha Seahaven Sky Edition",
    developer: "Sobha Realty",
    location: "Dubai Harbour Waterfront",
    starting_price_aed: 3800000.0,
    starting_price_usd: 1034717.0,
    completion_date: "Q4 2026",
    project_type: "Luxury Waterfront Sky Suites",
    projected_net_yield: 8.5,
    five_year_capital_gain: 41.2,
    payment_plan: "80/20 Post-Handover Scheme",
    dld_escrow_number: "DLD-ESC-2023-8812",
    golden_visa_eligible: true,
    crypto_accepted: true,
    supported_cryptos: ["USDT", "USDC", "BTC"],
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ],
    key_features: [
      "Panoramic Views of Palm Jumeirah & Ain Dubai",
      "Ultra-Prime Superyacht Marina Location",
      "Direct Developer Financing Available",
      "Automated Rental Management Desk"
    ],
    description: "Unrivaled waterfront luxury at Dubai Harbour with front-row views of Palm Jumeirah. Institutional-grade yield potential."
  }
];

export const OffPlanMatcher: React.FC = () => {
  const { t } = useLanguage();
  const { currency, formatPrice } = useCurrency();
  const [projects, setProjects] = useState<RealEstateProject[]>(DEFAULT_PROJECTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterDeveloper, setFilterDeveloper] = useState<string>('all');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await apiService.getInventory();
        if (data && Array.isArray(data) && data.length > 0) {
          setProjects(data);
        }
      } catch (_) {
        // Retain DEFAULT_PROJECTS on connection error
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
            {t('offplan.catalogTitle', 'Dubai Off-Plan Project Catalog & Matcher')}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            {t('offplan.catalogSubtitle', 'Prime developments secured under official Dubai Land Department (DLD) escrow accounts with 10-year Golden Visa eligibility and crypto transaction rails (USDT/BTC/ETH).')}
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
            <span>{cryptoOnly ? t('offplan.cryptoOnlyBtn', '🪙 Showing Crypto Only') : t('offplan.filterCryptoBtn', '🪙 Filter Crypto-Friendly')}</span>
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
              {dev === 'all' ? t('offplan.allDevs', 'All') : dev}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400 font-serif-luxury">{t('offplan.loadingInventory', 'Loading Dubai inventory...')}</div>
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
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">{t('offplan.projectedYield', 'Projected Yield')}</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">+{proj.projected_net_yield}% Net</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {proj.description}
                </p>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">{t('offplan.keyFeatures', 'Key Features:')}</span>
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
                    <span className="text-slate-500 block text-[11px]">{t('offplan.startingPrice', 'Starting Price:')}</span>
                    <span className="font-bold text-white font-mono text-sm">{formatPrice(proj.starting_price_aed, 'AED')}</span>
                    <span className="text-[11px] text-gold-400/90 block font-mono">
                      {currency !== 'AED' ? `(AED ${proj.starting_price_aed.toLocaleString()})` : `($${proj.starting_price_usd.toLocaleString()} USD)`}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">{t('offplan.paymentStructure', 'Payment Structure:')}</span>
                    <span className="font-semibold text-slate-200 text-xs">{proj.payment_plan}</span>
                    <span className="text-[11px] text-slate-400 block font-mono">{t('offplan.handover', 'Handover:')} {proj.completion_date}</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">{t('offplan.escrowAccount', 'Escrow Account:')} <strong className="text-slate-200">{proj.dld_escrow_number}</strong></span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-4 h-4" /> {t('offplan.protectedDld', '100% DLD Escrow Protected')}
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
