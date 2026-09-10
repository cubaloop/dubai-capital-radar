import React from 'react';
import { ShieldCheck, MessageSquare, BarChart, Phone, CheckCircle2, Zap, LayoutDashboard, Globe, Search } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-gold-500 selection:text-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-gold-500">✈️</span> OUTPILOT
              </span>
            </div>
            <div className="hidden md:flex gap-8 text-sm font-mono font-medium">
              <a href="#features" className="text-slate-400 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-slate-400 hover:text-white transition">Pricing</a>
            </div>
            <div className="flex gap-4">
              <a href="/login" className="text-sm font-mono font-bold text-slate-300 hover:text-white transition py-2">
                Login
              </a>
              <a href="/register" className="text-sm font-mono font-bold bg-gold-500 hover:bg-gold-400 text-slate-950 px-4 py-2 rounded-lg transition shadow-lg shadow-gold-500/20">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-500/10 via-transparent to-transparent -z-10" />
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
          Turn Cold Leads into<br/>
          <span className="text-gold-500">Closed Deals — Automatically</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto font-light">
          AI-Powered Lead Outreach & CRM. Scale your sales with intelligent WhatsApp automation, smart follow-ups, and a centralized dashboard designed for modern agencies.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a href="/register" className="bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold px-8 py-4 rounded-xl text-lg transition-transform hover:scale-105 shadow-xl shadow-gold-500/20 flex items-center justify-center gap-2">
            Start Free Trial
          </a>
          <a href="#demo" className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-xl text-lg transition-transform hover:scale-105 flex items-center justify-center gap-2">
            Book a Demo
          </a>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-6">
            Trusted by top sales agencies in UAE, Spain & Latin America
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
            <div className="text-xl font-black">EMAAR</div>
            <div className="text-xl font-black">DAMAC</div>
            <div className="text-xl font-black">SOBHA</div>
            <div className="text-xl font-black">NAKHEEL</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Supercharge Your Outreach</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Everything you need to manage leads and automate conversations at scale.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: <Zap className="w-6 h-6 text-gold-400" />, title: "AI Message Generation", desc: "Craft hyper-personalized WhatsApp messages instantly using state-of-the-art AI." },
            { icon: <MessageSquare className="w-6 h-6 text-gold-400" />, title: "WhatsApp Automation", desc: "Automate your follow-up sequences without risking bans. Human-like sending cadence." },
            { icon: <LayoutDashboard className="w-6 h-6 text-gold-400" />, title: "Smart CRM", desc: "Organize, tag, and track your leads through your custom sales pipeline effortlessly." },
            { icon: <BarChart className="w-6 h-6 text-gold-400" />, title: "Analytics Dashboard", desc: "Track performance, response rates, and revenue impact in real-time." },
            { icon: <Search className="w-6 h-6 text-gold-400" />, title: "Campaign Manager", desc: "Run targeted outreach campaigns from Excel/CSV uploads with complete control." },
            { icon: <Globe className="w-6 h-6 text-gold-400" />, title: "Multi-channel Outreach", desc: "Seamlessly integrate WhatsApp, Email, and SMS for unified communications." }
          ].map((feature, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-gold-500/50 transition">
              <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center mb-4 border border-slate-800">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Simple, Transparent Pricing</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Choose the plan that fits your agency's scale.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Starter */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col">
            <h3 className="text-xl font-bold mb-2">Starter</h3>
            <div className="text-4xl font-black mb-6">$49<span className="text-lg text-slate-500 font-normal">/mo</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              {['1 WhatsApp line', 'Up to 500 leads/month', 'AI messages', 'Basic CRM'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <a href="/register" className="block w-full py-3 text-center rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition">Select Starter</a>
          </div>
          {/* Professional */}
          <div className="bg-gradient-to-b from-gold-900/40 to-slate-900 border border-gold-500/50 p-8 rounded-3xl flex flex-col relative scale-105 shadow-2xl shadow-gold-500/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold-500 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <h3 className="text-xl font-bold mb-2 text-gold-400">Professional</h3>
            <div className="text-4xl font-black mb-6">$149<span className="text-lg text-slate-500 font-normal">/mo</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              {['3 WhatsApp lines', 'Up to 5,000 leads/month', 'Advanced AI Customization', 'Analytics Dashboard', 'Priority Support'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <a href="/register" className="block w-full py-3 text-center rounded-xl bg-gold-500 hover:bg-gold-400 text-slate-950 font-bold transition">Start Free Trial</a>
          </div>
          {/* Enterprise */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <div className="text-4xl font-black mb-6">$399<span className="text-lg text-slate-500 font-normal">/mo</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              {['Unlimited WhatsApp lines', 'Unlimited leads', 'Custom AI training', 'White-label dashboard', 'Dedicated account manager'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <a href="#contact" className="block w-full py-3 text-center rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition">Contact Sales</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 text-center text-slate-500 text-sm bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-bold text-white flex items-center gap-2">
            <span className="text-gold-500">✈️</span> OUTPILOT
          </div>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-gold-400 transition">Terms & Conditions</a>
            <a href="/privacy" className="hover:text-gold-400 transition">Privacy Policy</a>
          </div>
          <div>&copy; 2026 Outpilot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
