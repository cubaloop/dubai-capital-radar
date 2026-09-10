import React, { useState } from 'react';
import { ShieldCheck, MessageSquare, BarChart, Phone, CheckCircle2, Zap, LayoutDashboard, Globe, Search, Sparkles, X } from 'lucide-react';

const PLANS = [
  {
    name: 'Free Trial',
    price: '$0',
    period: 'forever',
    badge: null,
    highlight: false,
    color: 'emerald',
    description: 'Try Outpilot with real data. No card required.',
    cta: 'Start Free — No Card Needed',
    ctaHref: '/register?plan=free',
    features: [
      { text: '500 AI-personalized messages included', strong: true },
      { text: '1 WhatsApp line (Baileys)' },
      { text: 'Up to 100 leads in CRM' },
      { text: 'Full Campaign Manager access' },
      { text: 'AI Copilot (50 queries)' },
      { text: 'Basic Analytics' },
      { text: 'No credit card required', strong: true },
    ],
    limit: '500 msgs trial',
  },
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    badge: null,
    highlight: false,
    color: 'slate',
    description: 'For individual agents and small teams.',
    cta: 'Get Started',
    ctaHref: '/register?plan=starter',
    features: [
      { text: '2,000 AI messages/month' },
      { text: '1 WhatsApp line' },
      { text: 'Unlimited leads' },
      { text: 'Campaign Manager' },
      { text: 'Full CRM + Analytics' },
      { text: 'AI Copilot (500 queries/mo)' },
      { text: 'Email support' },
    ],
    limit: '2K msgs/mo',
  },
  {
    name: 'Professional',
    price: '$149',
    period: '/mo',
    badge: 'Most Popular',
    highlight: true,
    color: 'gold',
    description: 'For growing agencies running multiple campaigns.',
    cta: 'Start Free Trial',
    ctaHref: '/register?plan=professional',
    features: [
      { text: '15,000 AI messages/month', strong: true },
      { text: '3 WhatsApp lines (official API ready)' },
      { text: 'Unlimited leads & campaigns' },
      { text: 'Advanced AI customization' },
      { text: 'Full Analytics + Funnels' },
      { text: 'Unlimited AI Copilot' },
      { text: 'Priority support' },
    ],
    limit: '15K msgs/mo',
  },
  {
    name: 'Enterprise',
    price: '$399',
    period: '/mo',
    badge: null,
    highlight: false,
    color: 'slate',
    description: 'For multi-brand agencies and franchises.',
    cta: 'Contact Sales',
    ctaHref: '#contact',
    features: [
      { text: 'Unlimited AI messages', strong: true },
      { text: 'Unlimited WhatsApp lines' },
      { text: 'Multi-team / multi-branch' },
      { text: 'Custom AI training on your products' },
      { text: 'White-label dashboard' },
      { text: 'Dedicated account manager' },
      { text: 'SLA + API access' },
    ],
    limit: 'Unlimited',
  },
];

const FEATURES = [
  { icon: <Zap className="w-6 h-6 text-gold-400" />, title: 'AI Message Generation', desc: 'Craft hyper-personalized messages instantly. Each one adapted to the lead\'s name, context, and stage.' },
  { icon: <MessageSquare className="w-6 h-6 text-gold-400" />, title: 'WhatsApp Automation', desc: 'Send at human-like cadence. No bans, no spam flags. Optional official WhatsApp Business API.' },
  { icon: <LayoutDashboard className="w-6 h-6 text-gold-400" />, title: 'Smart CRM', desc: 'Organize, tag, and track leads through your sales pipeline. Call, message, and log — all in one click.' },
  { icon: <BarChart className="w-6 h-6 text-gold-400" />, title: 'Analytics Dashboard', desc: 'Track response rates, conversion funnels, and campaign ROI in real time.' },
  { icon: <Search className="w-6 h-6 text-gold-400" />, title: 'Campaign Manager', desc: 'Import any Excel/CSV list. AI generates a unique message per lead. You send when ready.' },
  { icon: <Globe className="w-6 h-6 text-gold-400" />, title: 'Multi-channel Ready', desc: 'WhatsApp today, Email & SMS tomorrow. One unified platform for all your outreach.' },
];

// Simple FAQ component
const FAQ_ITEMS = [
  { q: 'Do I need a credit card for the Free Trial?', a: 'No. Sign up with your email and start sending. Your 500 free AI messages never expire — they\'re yours to use at your own pace.' },
  { q: 'What happens when I use all 500 free messages?', a: 'Your account stays active. You can still use the CRM and campaign manager. To send more AI messages, upgrade to any paid plan at any time.' },
  { q: 'Can I use my own WhatsApp number?', a: 'Yes. Connect your business WhatsApp via QR code scan. For production scale without ban risk, we support the official WhatsApp Business API (requires a verified number from Meta or a provider like 360dialog).' },
  { q: 'Is it safe to send mass messages?', a: 'Outpilot uses human-like sending cadence, daily limits, and optional delay randomization to minimize ban risk. For guaranteed compliance, use the official WhatsApp Business API available on Starter and above.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Cancel from your dashboard before the next billing cycle.' },
];

export const LandingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F4F5FA] dark:bg-[#201D34] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/85 dark:bg-[#28243D]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-[#3A354C]/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <a href="/crm" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/25">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Outpilot</span>
            </a>
            <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a href="#features" className="hover:text-primary-500 transition">Features</a>
              <a href="#pricing" className="hover:text-primary-500 transition">Pricing</a>
              <a href="/crm" className="hover:text-primary-500 text-primary-600 dark:text-primary-400 font-bold transition flex items-center gap-1.5">🚀 Ir al CRM</a>
              <a href="/demo" className="hover:text-amber-500 text-amber-600 dark:text-amber-400 font-bold transition flex items-center gap-1">🎯 Modo Demo</a>
              <a href="#faq" className="hover:text-primary-500 transition">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <a href="/login" className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-primary-500 transition py-2 px-3">Login</a>
              <a href="/crm" className="text-sm font-bold bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl transition shadow-md shadow-primary-500/25">
                Abrir Sistema
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent -z-10" />

        {/* Free trial pill */}
        <a href="/register?plan=free" className="inline-flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-sm font-semibold px-4 py-2 rounded-full mb-8 hover:bg-emerald-950 transition">
          <Sparkles className="w-3.5 h-3.5" />
          500 free AI messages — No card required
          <span className="text-emerald-600">→</span>
        </a>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight text-slate-900 dark:text-white">
          <span>Turn Cold Leads into</span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-indigo-600">
            Closed Deals — Automatically
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
          AI-powered CRM + WhatsApp automation. Import your lead list, let AI write a personalized message for each contact, and send with one click. Track everything in a unified dashboard.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a href="/crm" className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:shadow-primary-500/30 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            Acceder al Sistema CRM
          </a>
          <a href="/demo" className="bg-white dark:bg-[#28243D] border border-slate-200 dark:border-[#3A354C] hover:border-primary-500 text-slate-800 dark:text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-md flex items-center justify-center gap-2">
            🎯 Probar Demo Interactivo
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-500">500 mensajes de prueba IA incluidos · Sin tarjeta requerida · Acceso instantáneo</p>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-slate-200/80 dark:border-[#3A354C]/80 bg-white/50 dark:bg-[#28243D]/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-6">
            Used by sales agencies in UAE, Spain & Latin America
          </p>
          <div className="flex flex-wrap justify-center gap-10 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all text-slate-700 dark:text-slate-300">
            <span className="text-lg font-black tracking-wider">REAL ESTATE</span>
            <span className="text-lg font-black tracking-wider">INSURANCE</span>
            <span className="text-lg font-black tracking-wider">FINANCE</span>
            <span className="text-lg font-black tracking-wider">CONSULTING</span>
            <span className="text-lg font-black tracking-wider">RETAIL</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-slate-900 dark:text-white">Everything in One Place</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">Stop switching between tools. Outpilot handles your leads, messages, tracking, and analytics — end to end.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="materio-card p-6 group hover:border-primary-500/50">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center mb-4 group-hover:bg-primary-500 group-hover:text-white transition-all">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-slate-900 dark:text-white">Start Free. Scale When Ready.</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">Your first 500 AI-personalized messages are free. No card, no commitment. Upgrade when you're convinced.</p>
          </div>

          {/* Free trial highlight bar */}
          <div className="max-w-3xl mx-auto mb-12 mt-8 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/25 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 text-lg">Free Trial includes 500 real AI messages</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Connect your WhatsApp, import your leads, and see Outpilot work with your actual contacts. Upgrade only if you love it.</div>
            </div>
            <a href="/register?plan=free" className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm shadow-sm">
              Start Free →
            </a>
          </div>

          {/* Pricing grid — 4 cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`relative flex flex-col rounded-2xl p-7 border transition-all ${
                  plan.highlight
                    ? 'bg-white dark:bg-[#28243D] border-primary-500 shadow-xl shadow-primary-500/15 scale-105 ring-2 ring-primary-500/30'
                    : plan.color === 'emerald'
                    ? 'materio-card border-emerald-300 dark:border-emerald-500/30'
                    : 'materio-card'
                }`}
              >
                {plan.badge && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-lg font-bold ${plan.color === 'gold' ? 'text-primary-600 dark:text-primary-400' : plan.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {plan.name}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      plan.color === 'emerald' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      plan.color === 'gold' ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>{plan.limit}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{plan.price}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm mb-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.color === 'gold' ? 'text-primary-500' :
                        plan.color === 'emerald' ? 'text-emerald-500' :
                        'text-slate-400'
                      }`} />
                      <span className={feat.strong ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-300'}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.ctaHref}
                  className={`block w-full py-3 text-center rounded-xl font-bold text-sm transition ${
                    plan.highlight
                      ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/25'
                      : plan.color === 'emerald'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            All paid plans include: 14-day money-back guarantee · Cancel anytime · No setup fees
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="text-slate-600 dark:text-slate-400">Everything you need to know before you start.</p>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="materio-card overflow-hidden">
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#3A354C]/40 transition font-semibold text-slate-800 dark:text-slate-200"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className={`text-primary-500 font-bold transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed border-t border-slate-100 dark:border-[#3A354C]">
                  <p className="mt-3">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section id="contact" className="py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white">
            Ready to close more deals?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-10">
            Start with 500 free AI messages. No card. No risk. Just results.
          </p>
          <a href="/crm" className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-10 py-5 rounded-xl text-xl transition-all hover:shadow-xl hover:shadow-primary-500/30">
            <Sparkles className="w-6 h-6" />
            Acceder al Sistema Ahora
          </a>
          <p className="mt-6 text-sm text-slate-500">
            Need a custom plan? <a href="mailto:support@outpilot.ae" className="text-primary-500 hover:underline">Contact sales →</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-[#3A354C] py-12 bg-white dark:bg-[#201D34]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Outpilot
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="/terms" className="hover:text-primary-500 transition">Terms & Conditions</a>
            <a href="/privacy" className="hover:text-primary-500 transition">Privacy Policy</a>
            <a href="mailto:support@outpilot.ae" className="hover:text-primary-500 transition">support@outpilot.ae</a>
          </div>
          <div className="text-sm text-slate-500">© 2026 Outpilot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
