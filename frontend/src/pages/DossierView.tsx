import React, { useState, useEffect, useMemo } from 'react';
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
  Award, 
  PhoneCall,
  Globe,
  Coins
} from 'lucide-react';
import { DossierResponse, RealEstateProject } from '../types';
import { apiService } from '../services/api';

interface DossierViewProps {
  slugOrId: string;
  onBack?: () => void;
  isClientDirectView?: boolean;
}

type CurrencyCode = 'USD' | 'AED' | 'EUR' | 'GBP';
type LanguageCode = 'en' | 'es' | 'fr' | 'ar' | 'ru';

const CURRENCY_RATES: Record<CurrencyCode, { symbol: string; rate: number; label: string }> = {
  USD: { symbol: '$', rate: 1.0, label: 'USD ($)' },
  AED: { symbol: 'AED ', rate: 3.6725, label: 'AED (د.إ)' },
  EUR: { symbol: '€', rate: 0.925, label: 'EUR (€)' },
  GBP: { symbol: '£', rate: 0.782, label: 'GBP (£)' },
};

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    back: 'Back to Liquidity Radar',
    confidential: 'CONFIDENTIAL • FAMILY OFFICE ASSET ALLOCATION',
    thesis_tag: 'Asset Allocation & Tax Arbitrage Thesis',
    thesis_title: 'Wealth Preservation & 10-Year Golden Visa for',
    five_yr_savings: '5-Year Tax Drag Saved',
    vs_jurisdiction: 'vs. home jurisdiction',
    gv_eligibility: 'Golden Visa Eligibility',
    ten_years: '10 Years',
    gv_desc: 'Renewable • Family Included',
    sovereign_protection: 'Sovereign Protection',
    escrow_desc: 'Dubai Land Department',
    sim_title: 'Dynamic Tax Arbitrage Simulator',
    sim_subtitle: 'Adjust liquidity parameters to evaluate real-time tax optimization in Dubai (0% Income & Capital Gains).',
    home_rate: 'Effective Home Rate',
    gross_income: 'Annual Gross Income:',
    cap_gains: 'Capital Gains / Liquidity:',
    home_liability: 'Tax Liability in',
    home_liability_desc: 'Personal income tax + capital gains retention & wealth drag.',
    dubai_liability: 'Tax Liability in Dubai (UAE)',
    dubai_zero: '0.00 (0% Personal Tax)',
    dubai_liability_desc: '100% capital retention for compounding in prime yield assets.',
    portfolio_title: 'Curated Trophy Portfolio (+2M AED Golden Visa)',
    portfolio_subtitle: 'Tier-1 assets registered under official DLD escrow accounts qualifying for permanent residency.',
    entry_price: 'Starting Price:',
    payment_plan: 'Payment Structure:',
    escrow_label: 'DLD Escrow:',
    gv_approved: 'Golden Visa Approved',
    roadmap_title: 'Golden Visa Residency Roadmap (21 Days)',
    cta_title: 'Schedule Confidential Wealth Structuring Briefing',
    cta_subtitle: 'Coordinate a private 15-minute executive session with our DIFC team to review unit allocation and Golden Visa fast-track.',
    cta_zoom: 'Schedule Executive Zoom Briefing',
    cta_whatsapp: 'Direct VIP WhatsApp',
    cta_call: 'Direct Call (+971 50 137 8020)',
    net_yield: 'Net Yield'
  },
  es: {
    back: 'Volver al Radar de Liquidez',
    confidential: 'CONFIDENCIAL • FAMILY OFFICE STRUCTURING',
    thesis_tag: 'Tesis de Inversión y Arbitraje Fiscal',
    thesis_title: 'Estructura Patrimonial & Golden Visa para',
    five_yr_savings: 'Ahorro Fiscal a 5 Años',
    vs_jurisdiction: 'vs. jurisdicción de origen',
    gv_eligibility: 'Elegibilidad Golden Visa',
    ten_years: '10 Años',
    gv_desc: 'Renovable • Familia Incluida',
    sovereign_protection: 'Protección Soberana',
    escrow_desc: 'Dubai Land Department',
    sim_title: 'Simulador Dinámico de Arbitraje Fiscal',
    sim_subtitle: 'Ajusta tus parámetros de liquidez para ver la optimización impositiva en Dubái (0% IRPF y Plusvalías).',
    home_rate: 'Tipo Impositivo Origen',
    gross_income: 'Ingresos Anuales Brutos:',
    cap_gains: 'Ganancia de Capital / Liquidez:',
    home_liability: 'Carga Fiscal en',
    home_liability_desc: 'Impuesto sobre la renta + Retención sobre plusvalías y patrimonio.',
    dubai_liability: 'Carga Fiscal en Dubái (EAU)',
    dubai_zero: '0.00 (0% Impuesto Personal)',
    dubai_liability_desc: '100% de retención de capital para reinversión en activos de alto rendimiento.',
    portfolio_title: 'Cartera Inmobiliaria Asignada (+2M AED Golden Visa)',
    portfolio_subtitle: 'Activos curados bajo cuenta de custodia oficial de la DLD que satisfacen el umbral de residencia.',
    entry_price: 'Precio de Entrada:',
    payment_plan: 'Estructura de Pagos:',
    escrow_label: 'DLD Escrow:',
    gv_approved: 'Golden Visa Aprobado',
    roadmap_title: 'Hoja de Ruta de Residencia Golden Visa (21 Días)',
    cta_title: 'Agendar Sesión Privada de Estructuración Patrimonial',
    cta_subtitle: 'Coordina una sesión confidencial de 15 minutos con nuestro equipo en DIFC para revisar unidades y Golden Visa.',
    cta_zoom: 'Agendar Briefing Ejecutivo (Zoom)',
    cta_whatsapp: 'Contactar por WhatsApp VIP',
    cta_call: 'Llamar Directo (+971 50 137 8020)',
    net_yield: 'Yield Neto'
  },
  fr: {
    back: 'Retour au Radar de Liquidité',
    confidential: 'CONFIDENTIEL • STRUCTURATION DE PATRIMOINE',
    thesis_tag: "Thèse d'Arbitrage Fiscal et d'Investissement",
    thesis_title: 'Préservation de Patrimoine & Golden Visa pour',
    five_yr_savings: 'Économies Fiscales sur 5 Ans',
    vs_jurisdiction: "vs. juridiction d'origine",
    gv_eligibility: 'Éligibilité Golden Visa',
    ten_years: '10 Ans',
    gv_desc: 'Renouvelable • Famille Incluse',
    sovereign_protection: 'Protection Souveraine',
    escrow_desc: 'Dubai Land Department',
    sim_title: "Simulateur d'Arbitrage Fiscal",
    sim_subtitle: 'Ajustez vos paramètres de liquidité pour évaluer votre optimisation fiscale à Dubaï (0% IRP/Plus-values).',
    home_rate: "Taux Effectif d'Origine",
    gross_income: 'Revenu Brut Annuel:',
    cap_gains: 'Plus-values / Liquidités:',
    home_liability: 'Impôts exigibles en',
    home_liability_desc: "Impôt sur le revenu + prélèvements sociaux et impôt sur la fortune.",
    dubai_liability: 'Impôts à Dubaï (ÉAU)',
    dubai_zero: '0.00 (0% Impôt Personnel)',
    dubai_liability_desc: 'Rétention intégrale du capital pour réinvestissement dans des actifs de prestige.',
    portfolio_title: 'Portefeuille Immobilier Éligible (+2M AED Golden Visa)',
    portfolio_subtitle: 'Actifs certifiés sous compte séquestre DLD garantissant la résidence permanente.',
    entry_price: "Prix d'Entrée:",
    payment_plan: 'Plan de Paiement:',
    escrow_label: 'Compte Séquestre DLD:',
    gv_approved: 'Golden Visa Approuvé',
    roadmap_title: 'Feuille de Route Golden Visa (21 Jours)',
    cta_title: 'Réserver une Séance Confidentielle',
    cta_subtitle: 'Coordonnez une session exécutive de 15 minutes avec notre équipe DIFC.',
    cta_zoom: 'Réserver un Briefing Zoom',
    cta_whatsapp: 'WhatsApp VIP Direct',
    cta_call: 'Appel Direct (+971 50 137 8020)',
    net_yield: 'Rendement Net'
  },
  ar: {
    back: 'العودة إلى رادار السيولة',
    confidential: 'سري للغاية • إدارة الثروات والمكاتب العائلية',
    thesis_tag: 'أطروحة الاستثمار والتحكيم الضريبي',
    thesis_title: 'حفظ الثروات والإقامة الذهبية لمدة 10 سنوات لـ',
    five_yr_savings: 'الوفر الضريبي خلال 5 سنوات',
    vs_jurisdiction: 'مقارنة ببلد الإقامة الأصلي',
    gv_eligibility: 'أهلية الإقامة الذهبية',
    ten_years: '10 سنوات',
    gv_desc: 'قابلة للتجديد • تشمل العائلة',
    sovereign_protection: 'حماية حكومية معتمدة',
    escrow_desc: 'دائرة الأراضي والأملاك في دبي (DLD)',
    sim_title: 'حاسبة التحكيم الضريبي المباشر',
    sim_subtitle: 'قم بتعديل بيانات السيولة لمعرفة حجم التوفير الضريبي في دبي (0% ضرائب دخل وأرباح رأسمالية).',
    home_rate: 'معدل الضريبة الفعلي',
    gross_income: 'الدخل السنوي الإجمالي:',
    cap_gains: 'الأرباح الرأسمالية / السيولة:',
    home_liability: 'الالتزام الضريبي في',
    home_liability_desc: 'ضرائب الدخل والأرباح الرأسمالية والثروة في بلدك.',
    dubai_liability: 'الالتزام الضريبي في دبي (الإمارات)',
    dubai_zero: '0.00 (0% ضريبة شخصية)',
    dubai_liability_desc: 'احتفاظ كامل برأس المال لإعادة الاستثمار في عقارات فاخرة عالية العائد.',
    portfolio_title: 'المحفظة العقارية المخصصة (أكثر من 2 مليون درهم)',
    portfolio_subtitle: 'عقارات مميزة مسجلة في حسابات الضمان المعتمدة لدى دائرة الأراضي والأملاك.',
    entry_price: 'سعر البدء:',
    payment_plan: 'خطة الدفع:',
    escrow_label: 'حساب الضمان DLD:',
    gv_approved: 'معتمد للإقامة الذهبية',
    roadmap_title: 'خارطة طريق الحصول على الإقامة الذهبية (21 يوماً)',
    cta_title: 'حجز جلسة استشارية خاصة لهيكلة الثروات',
    cta_subtitle: 'نسق جلسة عبر زوم لمدة 15 دقيقة مع مستشارينا في مركز دبي المالي العالمي (DIFC).',
    cta_zoom: 'حجز اجتماع تنفيذي عبر زووم',
    cta_whatsapp: 'تواصل مباشر عبر واتساب VIP',
    cta_call: 'اتصال مباشر (+971 50 137 8020)',
    net_yield: 'صافي العائد السنوي'
  },
  ru: {
    back: 'Назад к радару ликвидности',
    confidential: 'КОНФИДЕНЦИАЛЬНО • СТРУКТУРИРОВАНИЕ КАПИТАЛА',
    thesis_tag: 'Инвестиционный тезис и налоговый арбитраж',
    thesis_title: 'Защита активов и Золотая Виза на 10 лет для',
    five_yr_savings: 'Экономия на налогах за 5 лет',
    vs_jurisdiction: 'по сравнению с текущей юрисдикцией',
    gv_eligibility: 'Право на Золотую Визу',
    ten_years: '10 Лет',
    gv_desc: 'Продлеваемая • Включая семью',
    sovereign_protection: 'Государственная защита',
    escrow_desc: 'Земельный департамент Дубая (DLD)',
    sim_title: 'Интерактивный симулятор налоговой экономии',
    sim_subtitle: 'Настройте параметры ликвидности для расчета нулевого налогообложения в Дубае.',
    home_rate: 'Эффективная ставка налога',
    gross_income: 'Годовой валовой доход:',
    cap_gains: 'Прирост капитала / Ликвидность:',
    home_liability: 'Налоговые обязательства в',
    home_liability_desc: 'Налог на доходы, прирост капитала и богатство.',
    dubai_liability: 'Налоги в Дубае (ОАЭ)',
    dubai_zero: '0.00 (0% Личный налог)',
    dubai_liability_desc: '100% сохранение капитала для реинвестирования в высокодоходную недвижимость.',
    portfolio_title: 'Инвестиционный портфель (+2M AED Golden Visa)',
    portfolio_subtitle: 'Объекты с гарантированными эскроу-счетами DLD для получения ПМЖ.',
    entry_price: 'Начальная цена:',
    payment_plan: 'План оплаты:',
    escrow_label: 'Эскроу счет DLD:',
    gv_approved: 'Одобрено для Золотой Визы',
    roadmap_title: 'Дорожная карта получения Золотой Визы (21 День)',
    cta_title: 'Записаться на приватную консультацию',
    cta_subtitle: 'Запланируйте 15-минутный звонок с экспертами DIFC по распределению активов.',
    cta_zoom: 'Назначить звонок в Zoom',
    cta_whatsapp: 'Прямой WhatsApp VIP',
    cta_call: 'Прямой звонок (+971 50 137 8020)',
    net_yield: 'Чистая доходность'
  }
};

// Client-side Instant Synthesizer to guarantee zero loading hang
function buildInstantDossier(slug: string): DossierResponse {
  const cleanSlug = slug.toLowerCase();
  const parts = slug.replace('-principal-', ' ').replace('-demo', '').replace(/-/g, ' ').split(' ').filter(p => p && !/^\d+$/.test(p));
  const rawName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).slice(0, 4).join(' ') || 'Private Client';
  
  let country = 'United Kingdom';
  let currency: CurrencyCode = 'GBP';
  let taxRate = 45.0;

  if (cleanSlug.includes('munich') || cleanSlug.includes('berlin') || cleanSlug.includes('germany') || cleanSlug.includes('gmbh')) {
    country = 'Germany';
    currency = 'EUR';
    taxRate = 47.5;
  } else if (cleanSlug.includes('spain') || cleanSlug.includes('madrid') || cleanSlug.includes('barcelona')) {
    country = 'Spain';
    currency = 'EUR';
    taxRate = 47.0;
  } else if (cleanSlug.includes('france') || cleanSlug.includes('paris')) {
    country = 'France';
    currency = 'EUR';
    taxRate = 49.0;
  } else if (cleanSlug.includes('canada') || cleanSlug.includes('toronto')) {
    country = 'Canada';
    currency = 'USD';
    taxRate = 48.0;
  } else if (cleanSlug.includes('us') || cleanSlug.includes('america')) {
    country = 'United States';
    currency = 'USD';
    taxRate = 40.0;
  }

  const isCrypto = cleanSlug.includes('crypto') || cleanSlug.includes('token') || cleanSlug.includes('web3') || cleanSlug.includes('node') || cleanSlug.includes('whale');
  const income = 650000;
  const gains = 3500000;
  const homeLiability = (income * (taxRate / 100)) + (gains * (taxRate * 0.55 / 100));
  const fiveYearSavings = homeLiability * 5;

  const defaultProjects: RealEstateProject[] = [
    {
      id: 'proj-damac-chelsea-maritime',
      name: 'Chelsea Residences by DAMAC',
      developer: 'DAMAC Properties',
      location: 'Dubai Maritime City',
      starting_price_aed: 2100000.0,
      starting_price_usd: 571817.0,
      completion_date: 'Q4 2027',
      project_type: 'Luxury Waterfront Branded Residence',
      projected_net_yield: 8.8,
      five_year_capital_gain: 44.5,
      payment_plan: '70/30 (20% Down / 50% Construction / 30% Handover)',
      dld_escrow_number: 'DLD-ESC-2024-5519',
      golden_visa_eligible: true,
      crypto_accepted: true,
      supported_cryptos: ['USDT', 'BTC', 'ETH'],
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
      ],
      key_features: [
        'Direct Arabian Gulf & Superyacht Marina Views',
        '100% Direct Crypto-to-Escrow Settlements (USDT / BTC / ETH)',
        'Qualifies for Instant 10-Year Renewable UAE Golden Visa (+2M AED)',
        'VARA & Dubai Land Department Regulated Escrow Account'
      ],
      description: "DAMAC's signature coastal development in Dubai Maritime City. Full VARA-compliant cryptocurrency payment rails allowing seamless off-ramp directly into DLD escrow."
    },
    {
      id: 'proj-sobha-seahaven-harbour',
      name: 'Sobha Seahaven Sky Edition',
      developer: 'Sobha Realty',
      location: 'Dubai Harbour Waterfront',
      starting_price_aed: 3800000.0,
      starting_price_usd: 1034717.0,
      completion_date: 'Q4 2026',
      project_type: 'Luxury Waterfront Sky Suites',
      projected_net_yield: 8.5,
      five_year_capital_gain: 41.0,
      payment_plan: '60/40 (40% on Handover)',
      dld_escrow_number: 'DLD-ESC-2023-6612',
      golden_visa_eligible: true,
      crypto_accepted: true,
      supported_cryptos: ['USDT', 'BTC'],
      images: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
      ],
      key_features: [
        'Unobstructed Views of Palm Jumeirah and Ain Dubai',
        'Regulated Multi-Currency & Crypto Escrow Desk',
        'Superyacht Marina Berths at Your Doorstep',
        'Instant 10-Year UAE Golden Visa Allocation'
      ],
      description: "Sobha's flagship maritime tower in Dubai Harbour. Exceptional craftsmanship and streamlined institutional crypto transaction rails with guaranteed title deed registration."
    }
  ];

  return {
    dossier_id: `dos-${slug}`,
    slug: slug,
    created_at: new Date().toISOString(),
    prospect: {
      id: `prosp-${slug}`,
      name: rawName,
      email: 'confidential@familyoffice.com',
      role_title: 'Managing Partner & Principal',
      company_name: `${rawName} Group`,
      country: country,
      estimated_net_worth_usd: 8500000.0,
      liquidity_event: 'Institutional Liquidity & Asset Allocation Event',
      tier: 'Tier 1',
      interests: ['Tax Arbitrage', '10-Year Golden Visa', 'Dubai Prime Real Estate'],
      matched_projects: [],
      status: 'contacted'
    },
    tax_analysis: {
      home_country: country,
      annual_income_usd: income,
      capital_gains_usd: gains,
      home_tax_liability_usd: homeLiability,
      dubai_tax_liability_usd: 0.0,
      annual_tax_savings_usd: homeLiability,
      five_year_savings_usd: fiveYearSavings,
      effective_home_tax_rate: taxRate,
      dubai_effective_tax_rate: 0.0,
      golden_visa_eligible: true,
      recommended_investment_aed: 2200000.0,
      recommended_investment_usd: 599046.0
    },
    recommended_projects: defaultProjects,
    investment_thesis_narrative: `Confidential Asset Allocation & Tax Arbitrage Thesis for ${rawName}. Under ${country} fiscal jurisdiction, your portfolio faces an effective tax liability rate of ${taxRate}%, compounding to approximately $${fiveYearSavings.toLocaleString()} USD in tax drag over a 5-year holding period. By allocating into Dubai Land Department (DLD) escrow-protected Tier-1 real estate such as Chelsea Residences by DAMAC and Sobha Seahaven, you achieve 0% personal and capital gains taxation while securing a 10-Year Renewable UAE Golden Visa for your family.`,
    golden_visa_roadmap: isCrypto ? [
      {
        step: 'Phase 1: VARA-Compliant Crypto-to-Escrow Settlement',
        timeline: 'Days 1 - 3',
        description: 'Direct USDT/BTC payment execution via licensed UAE trustee directly into the DLD Escrow Account with 0% capital gains.'
      },
      {
        step: 'Phase 2: DLD Title Deed / Oqood Issuance',
        timeline: 'Days 4 - 8',
        description: 'Immediate registration of ownership with Dubai Land Department and Golden Visa nomination filing.'
      },
      {
        step: 'Phase 3: 10-Year Golden Visa & UAE Banking Setup',
        timeline: 'Days 9 - 18',
        description: 'Issuance of Emirates ID, 10-year residency visa and crypto-friendly private bank accounts (Emirates NBD / Wio Bank).'
      }
    ] : [
      {
        step: 'Phase 1: Escrow Allocation & Title Deed / Oqood',
        timeline: 'Days 1 - 7',
        description: 'Selection of qualifying Tier-1 unit (+2,000,000 AED) and registration with Dubai Land Department.'
      },
      {
        step: 'Phase 2: Fast-Track Medical & VIP Biometrics',
        timeline: 'Days 8 - 14',
        description: 'Private VIP concierge handling medical fitness test and Emirates ID issuance in Dubai.'
      },
      {
        step: 'Phase 3: 10-Year Golden Visa & Private Banking Setup',
        timeline: 'Days 15 - 21',
        description: 'Stamping of 10-year residency visa and introduction to Emirates NBD / FAB Private Wealth management.'
      }
    ],
    recommended_asset_allocation: {
      'Prime Waterfront / Capital Appreciation': 45.0,
      'High-Yield Off-Plan Rental Assets (8%+ ROI)': 35.0,
      'Liquid Treasury & UAE Private Banking Reserve': 20.0
    },
    calendly_link: 'https://calendly.com/dubai-private-wealth/vip-advisory',
    whatsapp_direct_link: 'https://wa.me/971501378020?text=Hello,%20I%20have%20reviewed%20my%20Confidential%20Dubai%20Wealth%20Dossier.'
  };
}

export const DossierView: React.FC<DossierViewProps> = ({ slugOrId, onBack, isClientDirectView = false }) => {
  const activeSlug = useMemo(() => {
    return slugOrId || (typeof window !== 'undefined' && window.location.pathname.startsWith('/dossier/') ? window.location.pathname.replace('/dossier/', '').split('/')[0] : 'alexander-wright-fintech-demo');
  }, [slugOrId]);

  // Initialize with instant fallback data to guarantee 0ms blank screen
  const [dossier, setDossier] = useState<DossierResponse>(() => buildInstantDossier(activeSlug));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customIncome, setCustomIncome] = useState<number>(dossier.tax_analysis.annual_income_usd);
  const [customCapitalGains, setCustomCapitalGains] = useState<number>(dossier.tax_analysis.capital_gains_usd);
  
  const detectCurrency = (country: string): CurrencyCode => {
    const c = country.toLowerCase();
    if (c.includes('united kingdom') || c.includes('uk') || c.includes('london') || c.includes('britain')) return 'GBP';
    if (c.includes('spain') || c.includes('france') || c.includes('germany') || c.includes('italy') || c.includes('europe')) return 'EUR';
    if (c.includes('uae') || c.includes('dubai') || c.includes('emirates')) return 'AED';
    return 'USD';
  };

  const [currency, setCurrency] = useState<CurrencyCode>(() => detectCurrency(dossier.prospect.country));
  const [language, setLanguage] = useState<LanguageCode>('en');

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Asynchronously fetch latest server-side synced version
  useEffect(() => {
    let isMounted = true;
    const fetchDossier = async () => {
      try {
        const cleanSlug = decodeURIComponent(activeSlug).trim();
        const data = await apiService.getDossier(cleanSlug);
        if (isMounted && data) {
          setDossier(data);
          setCustomIncome(data.tax_analysis.annual_income_usd);
          setCustomCapitalGains(data.tax_analysis.capital_gains_usd);
          setCurrency(detectCurrency(data.prospect.country));
        }
      } catch (err) {
        // Fallback already active and rendered seamlessly
        console.log('Using instant fallback dossier');
      }
    };
    if (activeSlug) {
      fetchDossier();
    }
    return () => { isMounted = false; };
  }, [activeSlug]);

  // Recalculate tax savings locally and via API
  const calculatedSavings = useMemo(() => {
    const rate = dossier.tax_analysis.effective_home_tax_rate / 100;
    const homeTax = (customIncome * rate) + (customCapitalGains * rate * 0.55);
    const annualSavings = homeTax;
    const fiveYearSavings = annualSavings * 5;
    return {
      homeTax,
      annualSavings,
      fiveYearSavings,
      effectiveRate: dossier.tax_analysis.effective_home_tax_rate
    };
  }, [customIncome, customCapitalGains, dossier]);

  const convertVal = (valInUSD: number): string => {
    const rateInfo = CURRENCY_RATES[currency];
    const converted = valInUSD * rateInfo.rate;
    return `${rateInfo.symbol}${Math.round(converted).toLocaleString()}`;
  };

  const { prospect, tax_analysis, recommended_projects, investment_thesis_narrative, golden_visa_roadmap } = dossier;

  return (
    <div className={`space-y-10 max-w-5xl mx-auto pb-16 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Control Bar: Currency & Language Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        {!isClientDirectView && onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs font-bold text-gold-400 font-mono uppercase tracking-wider bg-gold-950/40 px-3 py-1.5 rounded-xl border border-gold-800/40">
            <Lock className="w-3.5 h-3.5" /> Private Investor Suite
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Coins className="w-3.5 h-3.5 text-gold-400" />
            <div className="flex gap-1 font-mono font-bold">
              {(['USD', 'AED', 'EUR', 'GBP'] as CurrencyCode[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-0.5 rounded-md transition-all text-xs ${
                    currency === curr
                      ? 'bg-gold-500 text-slate-950 font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="en" className="bg-slate-900 text-white">English (Default)</option>
              <option value="es" className="bg-slate-900 text-white">Español</option>
              <option value="fr" className="bg-slate-900 text-white">Français</option>
              <option value="ar" className="bg-slate-900 text-white">العربية</option>
              <option value="ru" className="bg-slate-900 text-white">Русский</option>
            </select>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-gold-400 font-mono bg-gold-950/60 border border-gold-800/60 px-3 py-1.5 rounded-xl">
            <Lock className="w-3.5 h-3.5" /> {t.confidential}
          </div>
        </div>
      </div>

      {/* Hero Presentation Card */}
      <div className="glass-panel-gold rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-gold-500/30">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gold-500/10 text-gold-300 font-mono text-xs uppercase tracking-widest">
            {t.thesis_tag}
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-white tracking-tight leading-tight">
            {t.thesis_title} {prospect.name}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {investment_thesis_narrative}
          </p>
        </div>

        {/* Quick Highlights Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-800">
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-mono uppercase">{t.five_yr_savings}</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {convertVal(calculatedSavings.fiveYearSavings)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{t.vs_jurisdiction} {prospect.country}</div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-mono uppercase">{t.gv_eligibility}</div>
            <div className="text-2xl font-bold text-gold-400 mt-1 flex items-center gap-1.5">
              <Award className="w-6 h-6 text-gold-400" /> {t.ten_years}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{t.gv_desc}</div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
            <div className="text-xs text-slate-400 font-mono uppercase">{t.sovereign_protection}</div>
            <div className="text-2xl font-bold text-white mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-6 h-6 text-emerald-400" /> 100% Escrow
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{t.escrow_desc}</div>
          </div>
        </div>
      </div>

      {/* Interactive Tax Simulator */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif-luxury font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold-400" /> {t.sim_title}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t.sim_subtitle}
            </p>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-400 block">{t.home_rate}</span>
            <span className="text-lg font-bold text-rose-400">
              {calculatedSavings.effectiveRate}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">{t.gross_income}</span>
              <span className="text-gold-400 font-bold">{convertVal(customIncome)}</span>
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
              <span className="text-slate-300">{t.cap_gains}</span>
              <span className="text-gold-400 font-bold">{convertVal(customCapitalGains)}</span>
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
            <div className="text-xs text-rose-300 font-semibold uppercase tracking-wider">{t.home_liability} {prospect.country}</div>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              {convertVal(calculatedSavings.homeTax)}
            </div>
            <p className="text-[11px] text-rose-400/80 mt-1">
              {t.home_liability_desc}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
            <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">{t.dubai_liability}</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {CURRENCY_RATES[currency].symbol}{t.dubai_zero}
            </div>
            <p className="text-[11px] text-emerald-400/80 mt-1">
              {t.dubai_liability_desc}
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Trophy Assets */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-serif-luxury font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gold-400" /> {t.portfolio_title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t.portfolio_subtitle}
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
                {proj.crypto_accepted && (
                  <div className="absolute top-3 right-3 bg-purple-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-purple-300 border border-purple-600/50 flex items-center gap-1 shadow-lg">
                    <span>🪙 Crypto Escrow:</span>
                    <span className="font-mono">{proj.supported_cryptos?.join(', ') || 'USDT, BTC, ETH'}</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-bold text-white font-serif-luxury">{proj.name}</h3>
                    <p className="text-xs text-slate-300">{proj.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-mono">{t.net_yield}</span>
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
                    <span className="text-slate-500 block">{t.entry_price}</span>
                    <span className="font-bold text-white font-mono text-sm">
                      {convertVal(proj.starting_price_usd)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">AED {proj.starting_price_aed.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t.payment_plan}</span>
                    <span className="font-semibold text-slate-200 text-xs">{proj.payment_plan}</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t.escrow_label} <strong className="text-slate-200">{proj.dld_escrow_number}</strong></span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> {t.gv_approved}
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
          <Award className="w-5 h-5 text-gold-400" /> {t.roadmap_title}
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
          {t.cta_title}
        </h2>
        <p className="text-slate-300 text-sm max-w-xl mx-auto">
          {t.cta_subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
          <a
            href={dossier.calendly_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold-500 to-amber-300 hover:from-gold-600 hover:to-gold-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-gold-500/25 transition-all text-sm"
          >
            <Calendar className="w-4 h-4" /> {t.cta_zoom}
          </a>

          <a
            href={dossier.whatsapp_direct_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-semibold px-6 py-3.5 rounded-xl border border-emerald-600/40 transition-all text-sm"
          >
            <MessageSquare className="w-4 h-4" /> {t.cta_whatsapp}
          </a>

          <a
            href="tel:+971501378020"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-gold-400 font-semibold px-6 py-3.5 rounded-xl border border-gold-500/40 transition-all text-sm"
          >
            <PhoneCall className="w-4 h-4" /> {t.cta_call}
          </a>
        </div>
      </div>
    </div>
  );
};
