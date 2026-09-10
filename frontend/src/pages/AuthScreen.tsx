import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Building, LogIn, UserPlus, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const PLANS = [
  {
    id: 'free',
    label: 'Free Trial',
    sublabel: '500 AI messages · No card required',
    badge: '🎁 Start here',
    color: 'emerald',
  },
  {
    id: 'starter',
    label: 'Starter',
    sublabel: '$49/mo · 2,000 messages/mo',
    badge: null,
    color: 'slate',
  },
  {
    id: 'professional',
    label: 'Professional',
    sublabel: '$149/mo · 15,000 messages/mo',
    badge: '⭐ Most Popular',
    color: 'gold',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    sublabel: '$399/mo · Unlimited',
    badge: null,
    color: 'slate',
  },
];

export const AuthScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(location.pathname === '/register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [plan, setPlan] = useState('free');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Read plan from URL param e.g. /register?plan=professional
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlPlan = params.get('plan');
    if (urlPlan && PLANS.find(p => p.id === urlPlan)) {
      setPlan(urlPlan);
      setIsRegister(true);
    }
    if (location.pathname === '/register') setIsRegister(true);
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }

        let agencyData = null;
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              email,
              agency_name: agencyName,
              plan
            })
          });
          if (res.ok) {
            agencyData = await res.json();
          }
        } catch (apiErr) {
          console.warn('API register fallback to local state:', apiErr);
        }

        const user = {
          email,
          name,
          role: 'agency_owner',
          agencyName: agencyName || 'My Agency',
          plan,
          agencyId: agencyData?.agency?.id || `agency_${Date.now()}`,
          messagesUsed: agencyData?.quota?.messages_used ?? 0,
          messagesLimit: agencyData?.quota?.messages_limit ?? (plan === 'free' ? 500 : plan === 'starter' ? 2000 : plan === 'professional' ? 15000 : -1),
        };
        localStorage.setItem('dcr_user_session', JSON.stringify(user));
        navigate('/onboarding');
      } else {
        let agencyData = null;
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (res.ok) {
            agencyData = await res.json();
          }
        } catch (apiErr) {
          console.warn('API login fallback:', apiErr);
        }

        const user = {
          email,
          name: agencyData?.agency?.name || email.split('@')[0],
          role: 'agency_owner',
          agencyName: agencyData?.agency?.name || 'My Agency',
          plan: agencyData?.agency?.plan || 'free',
          agencyId: agencyData?.agency?.id || `agency_${Date.now()}`,
          messagesUsed: agencyData?.quota?.messages_used ?? 0,
          messagesLimit: agencyData?.quota?.messages_limit ?? 500,
        };
        localStorage.setItem('dcr_user_session', JSON.stringify(user));
        navigate('/crm');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentPlanInfo = PLANS.find(p => p.id === plan);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans p-4">
      {/* Background glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/6 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2.5 text-white hover:opacity-80 transition">
            <div className="w-10 h-10 bg-gradient-to-br from-gold-500 to-gold-700 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight">Outpilot</span>
          </a>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                !isRegister ? 'bg-slate-800 text-white border-b-2 border-gold-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LogIn className="w-4 h-4" /> Log In
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                isRegister ? 'bg-slate-800 text-white border-b-2 border-gold-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Create Account
            </button>
          </div>

          <div className="p-8">
            {/* Register: Free trial banner */}
            {isRegister && plan === 'free' && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-400 font-bold text-sm">500 free AI messages included</p>
                  <p className="text-slate-400 text-xs mt-0.5">No credit card required. Start sending personalized messages today.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 mb-5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Register fields */}
              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text" required
                        placeholder="John Smith"
                        value={name} onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Agency / Company Name</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text" required
                        placeholder="Acme Real Estate"
                        value={agencyName} onChange={e => setAgencyName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email" required
                    placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password" required
                    placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Confirm password (register only) */}
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password" required
                      placeholder="••••••••"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none transition"
                    />
                  </div>
                </div>
              )}

              {/* Plan selector (register only) */}
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Select Plan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLANS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlan(p.id)}
                        className={`relative text-left p-3 rounded-xl border text-xs transition-all ${
                          plan === p.id
                            ? p.color === 'emerald' ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                            : p.color === 'gold' ? 'bg-gold-950/40 border-gold-500 text-gold-300'
                            : 'bg-slate-800 border-slate-600 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold mb-0.5">{p.label}</div>
                        <div className="text-[10px] opacity-70">{p.sublabel}</div>
                        {p.badge && (
                          <div className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            p.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                            p.color === 'gold' ? 'bg-gold-500/20 text-gold-400' :
                            'bg-slate-700 text-slate-300'
                          }`}>{p.badge}</div>
                        )}
                        {plan === p.id && (
                          <CheckCircle2 className={`absolute bottom-1.5 right-1.5 w-3.5 h-3.5 ${
                            p.color === 'emerald' ? 'text-emerald-400' :
                            p.color === 'gold' ? 'text-gold-400' :
                            'text-slate-400'
                          }`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Remember me (login only) */}
              {!isRegister && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-700 bg-slate-950 text-gold-500 focus:ring-gold-500" />
                    Remember me
                  </label>
                  <a href="#" className="text-sm text-gold-400 hover:underline">Forgot password?</a>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 rounded-xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50
                  bg-gold-500 hover:bg-gold-400 text-slate-950 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/30"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : isRegister ? (
                  <>
                    {plan === 'free' ? <Sparkles className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {plan === 'free' ? 'Start Free Trial' : `Continue with ${currentPlanInfo?.label}`}
                  </>
                ) : (
                  <> <LogIn className="w-4 h-4" /> Sign In </>
                )}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Footer note */}
            {isRegister && (
              <p className="text-center text-xs text-slate-600 mt-5">
                By registering you agree to our{' '}
                <a href="/terms" className="text-slate-500 hover:text-gold-400 underline">Terms & Conditions</a>
              </p>
            )}
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-slate-600 hover:text-slate-400 transition">
            ← Back to homepage
          </a>
        </div>
      </div>
    </div>
  );
};
