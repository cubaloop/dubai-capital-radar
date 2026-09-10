import React, { useState } from 'react';
import { Mail, Lock, User, Building, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AuthScreen: React.FC = () => {
  const [isRegister, setIsRegister] = useState(window.location.pathname === '/register');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [plan, setPlan] = useState('Starter');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Mocked endpoint behavior
      if (isRegister) {
        // Mock registration
        alert("Registration coming soon — contact us to get started");
        navigate('/onboarding');
      } else {
        // Mock login
        const user = {
          email,
          name: 'Admin',
          role: 'agency_owner',
          agencyName: 'Outpilot Demo Agency'
        };
        localStorage.setItem('dcr_user_session', JSON.stringify(user));
        navigate('/crm');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative z-10">
        
        <div className="flex justify-center mb-8">
          <a href="/" className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="text-gold-500">✈️</span> OUTPILOT
          </a>
        </div>

        <div className="flex rounded-2xl bg-slate-950 p-1 mb-8 border border-slate-800">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              !isRegister ? 'bg-gold-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isRegister ? 'bg-gold-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text" required
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-gold-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Agency Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text" required
                    value={agencyName} onChange={e => setAgencyName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-gold-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Select Plan</label>
                <select
                  value={plan} onChange={e => setPlan(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-gold-500 outline-none appearance-none"
                >
                  <option>Starter ($49/mo)</option>
                  <option>Professional ($149/mo)</option>
                  <option>Enterprise ($399/mo)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-gold-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-gold-500 outline-none"
              />
            </div>
          </div>
          
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password" required
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-gold-500 outline-none"
                />
              </div>
            </div>
          )}

          {!isRegister && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="rounded border-slate-800 bg-slate-950 text-gold-500" />
              <label htmlFor="remember" className="text-sm text-slate-400">Remember me</label>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 mt-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-slate-950 font-black flex items-center justify-center gap-2 transition"
          >
            {isRegister ? 'Complete Registration' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
