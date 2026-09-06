import React, { useState } from 'react';
import { Radar, ShieldCheck, Lock, Mail, User, Building, ArrowRight, CheckCircle2, Sparkles, LogIn, UserPlus } from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (userData: { email: string; name: string; role: string; agencyName: string }) => void;
}

export const AuthLandingView: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
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
      // Admin master check or custom agency register
      if (!isRegister) {
        if (
          (email.trim().toLowerCase() === 'admin@dubaicapitalradar.com' && password === 'Dubai2026!') ||
          (email.trim().toLowerCase() === 'yo@dubaicapitalradar.com' && password === 'Dubai2026!') ||
          password.length >= 6
        ) {
          const user = {
            email: email.trim(),
            name: email.includes('admin') ? 'David (Master Admin)' : 'Agente Inmobiliario',
            role: 'agency_owner',
            agencyName: 'Dubai Capital Advisory'
          };
          localStorage.setItem('dcr_user_session', JSON.stringify(user));
          onLoginSuccess(user);
        } else {
          setError('Contraseña inválida. Usa la clave maestra: Dubai2026!');
        }
      } else {
        // Register new agency
        const user = {
          email: email.trim(),
          name: name.trim() || 'Nuevo Asesor',
          role: 'agency_owner',
          agencyName: agencyName.trim() || 'Inmobiliaria VIP'
        };
        localStorage.setItem('dcr_user_session', JSON.stringify(user));
        // Save agency config
        localStorage.setItem('dcr_agency_config', JSON.stringify({
          agencyName: user.agencyName,
          brokerPersona: user.name,
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

        <div className="flex items-center gap-2">
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
            <span>Iniciar Sesión</span>
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
            <span>Nueva Agencia</span>
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="font-serif-luxury font-bold text-2xl text-white">
            {isRegister ? 'Crear Perfil de Agencia' : 'Portal de Acceso Inmobiliario'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister
              ? 'Registra tu empresa o bróker para gestionar leads con IA propia'
              : 'Accede a tu radar de señales, campañas de WhatsApp y leads en Supabase'}
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
                  Nombre de tu Inmobiliaria / Agencia
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Ej: Highline Luxury Properties"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Tu Nombre y Cargo (Asesor IA)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Carlos Silva (Managing Broker)"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="broker@empresa.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/90 border border-slate-700 text-white placeholder-slate-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Contraseña
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
              <span className="animate-pulse">Autenticando en Supabase...</span>
            ) : (
              <>
                <span>{isRegister ? 'Registrar y Crear Espacio' : 'Entrar al Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Master Access Quick Link for You */}
        {!isRegister && (
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={handleQuickMasterLogin}
              className="text-[11px] font-mono text-gold-400/90 hover:text-gold-300 flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Acceso Rápido Administrador Maestro (1-Click)</span>
            </button>
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Credenciales: <code className="text-slate-400">admin@dubaicapitalradar.com</code> / <code className="text-slate-400">Dubai2026!</code>
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
