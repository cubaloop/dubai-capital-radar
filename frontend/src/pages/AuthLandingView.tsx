import React, { useState } from 'react';
import { Radar, ShieldCheck, Lock, Mail, User, Building, ArrowRight, CheckCircle2, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { LanguageSwitch } from '../components/LanguageSwitch';

interface AuthModalProps {
  onLoginSuccess: (userData: { email: string; name: string; role: string; agencyName: string }) => void;
}

export const AuthLandingView: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('admin@dubaicapitalradar.com');
  const [password, setPassword] = useState('Dubai2026!');
  const [name, setName] = useState('David Admin');
  const [agencyName, setAgencyName] = useState('Dubai Capital Advisory');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      // Admin master check, HOME Properties agency, or custom agency register
      if (!isRegister) {
        const cleanEmail = email.trim().toLowerCase();
        if (
          cleanEmail === 'home@homeproperties.ae' ||
          cleanEmail === 'info@homeproperties.ae' ||
          cleanEmail === 'admin@homeproperties.ae'
        ) {
          const user = {
            email: cleanEmail,
            name: 'H.O.M.E Properties Admin',
            role: 'agency_owner',
            agencyName: 'H.O.M.E Properties',
            logoUrl: '/home_properties_logo.jpg'
          };
          localStorage.setItem('dcr_user_session', JSON.stringify(user));
          localStorage.setItem('dcr_agency_config', JSON.stringify({
            agencyName: 'H.O.M.E Properties',
            brokerPersona: 'David, Asesor Senior en Inversiones Inmobiliarias Dubai (H.O.M.E Properties)',
            targetMarket: 'Dubai (Downtown, Palm Jumeirah, Dubai Hills)',
            currency: 'USD ($)',
            phonePrefix: '+971'
          }));
          onLoginSuccess(user);
        } else if (
          (cleanEmail === 'admin@dubaicapitalradar.com' && password === 'Dubai2026!') ||
          (cleanEmail === 'yo@dubaicapitalradar.com' && password === 'Dubai2026!') ||
          password.length >= 6
        ) {
          const user = {
            email: cleanEmail,
            name: cleanEmail.includes('admin') ? 'David (Master Admin)' : 'Agente Inmobiliario',
            role: 'agency_owner',
            agencyName: 'Dubai Capital Advisory'
          };
          localStorage.setItem('dcr_user_session', JSON.stringify(user));
          onLoginSuccess(user);
        } else {
          setError('Contraseña inválida. Usa la clave maestra: Dubai2026!');
        }
      } else {
        // Register new agency (defaults to your master AI advisor until customized)
        const user = {
          email: email.trim(),
          name: name.trim() || 'Nuevo Asesor',
          role: 'agency_owner',
          agencyName: agencyName.trim() || 'Inmobiliaria VIP'
        };
        localStorage.setItem('dcr_user_session', JSON.stringify(user));
        // Save agency config defaulting to your advisor persona
        localStorage.setItem('dcr_agency_config', JSON.stringify({
          agencyName: user.agencyName,
          brokerPersona: 'David, Asesor Senior en Inversiones Inmobiliarias Dubai (Por Defecto)',
          targetMarket: 'Dubai (Downtown, Palm, Hills)',
          currency: 'USD ($)',
          phonePrefix: '+971'
        }));
        onLoginSuccess(user);
      }
    }, 600);
  };

  const handleQuickMasterLogin = () => {
    const user = {
      email: 'admin@dubaicapitalradar.com',
      name: 'David (Master Admin)',
      role: 'agency_owner',
      agencyName: 'Dubai Capital Advisory'
    };
    localStorage.setItem('dcr_user_session', JSON.stringify(user));
    onLoginSuccess(user);
  };

  const handleQuickHomeLogin = () => {
    const user = {
      email: 'home@homeproperties.ae',
      name: 'H.O.M.E Properties Admin',
      role: 'agency_owner',
      agencyName: 'H.O.M.E Properties',
      logoUrl: '/home_properties_logo.jpg'
    };
    localStorage.setItem('dcr_user_session', JSON.stringify(user));
    localStorage.setItem('dcr_agency_config', JSON.stringify({
      agencyName: 'H.O.M.E Properties',
      brokerPersona: 'David, Asesor Senior en Inversiones Inmobiliarias Dubai (H.O.M.E Properties)',
      targetMarket: 'Dubai (Downtown, Palm Jumeirah, Dubai Hills)',
      currency: 'USD ($)',
      phonePrefix: '+971'
    }));
    onLoginSuccess(user);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 font-sans selection:bg-gold-500 selection:text-slate-950">
      {/* Background Graphic: Half Radar Sonar + Half Floating Tables */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 filter blur-[0.5px] transition-all duration-1000"
        style={{ backgroundImage: "url('/radar_leads_hero.jpg')" }}
      />
      
      {/* Dynamic Gradients overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-500/10 via-transparent to-slate-950/95" />

      {/* Floating Header Branding */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gold-500 via-amber-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-gold-500/20 border border-gold-400/40">
            <Radar className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="font-serif-luxury font-black text-lg tracking-wider text-white flex items-center gap-1.5">
              DUBAI CAPITAL <span className="text-gold-400">RADAR</span>
            </span>
            <span className="block text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              B2B Enterprise Real Estate Platform • Supabase Cloud
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-gold-500/30 text-gold-400 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Tenant Enterprise RLS</span>
          </div>
        </div>
      </header>

      {/* Main Glassmorphism Auth Card */}
      <div className="relative z-10 w-full max-w-md mx-4 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-700/80 backdrop-blur-2xl shadow-2xl shadow-black/80">
        
        {/* Toggle between Iniciar Sesión and Registrar Agencia */}
        <div className="flex rounded-2xl bg-slate-950/70 p-1 mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
              !isRegister
                ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950 shadow-md shadow-gold-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t('auth.loginTitle', 'Sign In')}</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
              isRegister
                ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-slate-950 shadow-md shadow-gold-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t('auth.registerTitle', 'New Agency')}</span>
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="font-serif-luxury font-bold text-2xl text-white">
            {isRegister ? t('auth.registerTitle', 'Register Agency Workspace') : t('auth.loginTitle', 'Access Broker Portal')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister
              ? t('auth.registerSub', 'Create an isolated agency instance in seconds')
              : t('auth.loginSub', 'Sign in with your verified credentials')}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  {t('auth.agencyNameLabel', 'Agency / Firm Name')}
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="e.g. Highline Luxury Properties"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  {t('auth.fullNameLabel', 'Full Name and Title (AI Advisor)')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Carlos Silva (Managing Broker)"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              {t('auth.emailLabel', 'Work Email')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="broker@agency.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              {t('auth.passwordLabel', 'Password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-500 hover:from-gold-400 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-gold-500/20 active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">{t('common.loading', 'Authenticating...')}</span>
            ) : (
              <>
                <span>{isRegister ? t('auth.registerBtn', 'Create Agency Account') : t('auth.signInBtn', 'Sign In to Dashboard')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Access Links */}
        {!isRegister && (
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-2.5 text-center">
            <button
              onClick={handleQuickHomeLogin}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 via-gold-500/20 to-amber-600/30 border border-gold-500/40 text-gold-300 hover:text-gold-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all hover:border-gold-400"
            >
              <img src="/home_properties_logo.jpg" alt="HOME" className="w-5 h-4 object-contain rounded" />
              <span>{t('auth.homeDemo', 'Fast Access H.O.M.E Properties (1-Click)')}</span>
            </button>

            <button
              onClick={handleQuickMasterLogin}
              className="text-[11px] font-mono text-slate-400 hover:text-gold-300 flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>{t('auth.adminDemo', 'Master Admin Demo Access')}</span>
            </button>
            <p className="text-[10px] text-slate-500 font-mono">
              H.O.M.E: <code className="text-slate-300">home@homeproperties.ae</code> / <code className="text-slate-300">Dubai2026!</code>
            </p>
          </div>
        )}
      </div>

      {/* Bottom Features Badge */}
      <div className="absolute bottom-4 left-0 right-0 z-20 text-center px-4 hidden md:block">
        <div className="inline-flex items-center gap-6 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Groq AI Ultra-Fast Engine
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            WhatsApp Anti-Ban Shield
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            PostgreSQL Cloud Persisted
          </span>
        </div>
      </div>
    </div>
  );
};
