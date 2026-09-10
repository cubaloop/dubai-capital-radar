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
    <div className="min-h-screen page-bg text-slate-100 font-sans selection:bg-gold-500 selection:text-slate-950">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-gold-500 to-gold-700 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-black tracking-tight text-white">Outpilot</span>
            </a>
            <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#pricing" className="hover:text-white transition">Pricing</a>
              <a href="/demo" className="hover:text-gold-400 text-gold-500 font-bold transition flex items-center gap-1">🎯 Live Demo</a>
              <a href="#faq" className="hover:text-white transition">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <a href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition py-2 px-3">Login</a>
              <a href="/register?plan=free" className="text-sm font-bold bg-gold-500 hover:bg-gold-400 text-slate-950 px-4 py-2 rounded-xl transition shadow-lg shadow-gold-500/20">
                Try Free
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-500/8 via-transparent to-transparent -z-10" />

        {/* Free trial pill */}
        <a href="/register?plan=free" className="inline-flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-sm font-semibold px-4 py-2 rounded-full mb-8 hover:bg-emerald-950 transition">
          <Sparkles className="w-3.5 h-3.5" />
          500 free AI messages — No card required
          <span className="text-emerald-600">→</span>
        </a>

        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
            Turn Cold Leads into
          </span>
          <br />
          <span className="text-gold-500">Closed Deals — Automatically</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
          AI-powered CRM + WhatsApp automation. Import your lead list, let AI write a personalized message for each contact, and send with one click. Track everything in a unified dashboard.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a href="/register?plan=free" className="bg-gold-500 hover:bg-gold-400 text-slate-950 font-black px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 shadow-xl shadow-gold-500/25 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5" />
            Start Free — 500 AI Messages
          </a>
          <a href="/demo" className="bg-slate-900 border border-gold-500/40 hover:border-gold-500 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
            🎯 Probar Demo Interactivo
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-500">No credit card · No time limit · Real system, real data</p>
      </section>

      {/* Social Proof */}
      <section className="py-10 border-y border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-6">
            Used by sales agencies in UAE, Spain & Latin America
          </p>
          <div className="flex flex-wrap justify-center gap-10 md:gap-16 opacity-40 grayscale">
            <span className="text-lg font-black">REAL ESTATE</span>
            <span className="text-lg font-black">INSURANCE</span>
            <span className="text-lg font-black">FINANCE</span>
            <span className="text-lg font-black">CONSULTING</span>
            <span className="text-lg font-black">RETAIL</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Everything in One Place</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Stop switching between tools. Outpilot handles your leads, messages, tracking, and analytics — end to end.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-gold-500/40 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center mb-4 border border-slate-800 group-hover:border-gold-500/30 transition">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Start Free. Scale When Ready.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Your first 500 AI-personalized messages are free. No card, no commitment. Upgrade when you're convinced.</p>
          </div>

          {/* Free trial highlight bar */}
          <div className="max-w-3xl mx-auto mb-12 mt-8 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/25 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-emerald-400 text-lg">Free Trial includes 500 real AI messages</div>
              <div className="text-sm text-slate-400 mt-0.5">Connect your WhatsApp, import your leads, and see Outpilot work with your actual contacts. Upgrade only if you love it.</div>
            </div>
            <a href="/register?plan=free" className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition text-sm">
              Start Free →
            </a>
          </div>

          {/* Pricing grid — 4 cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className={`relative flex flex-col rounded-3xl p-7 border transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-gold-900/30 to-slate-900 border-gold-500/50 shadow-2xl shadow-gold-500/10 scale-105'
                    : plan.color === 'emerald'
                    ? 'bg-slate-900 border-emerald-500/25 hover:border-emerald-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.badge && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-lg font-black ${plan.color === 'gold' ? 'text-gold-400' : plan.color === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>
                      {plan.name}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      plan.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                      plan.color === 'gold' ? 'bg-gold-500/10 text-gold-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>{plan.limit}</span>
                  </div>
                  <p className="text-slate-500 text-xs mb-4">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-500 text-sm mb-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.color === 'gold' ? 'text-gold-400' :
                        plan.color === 'emerald' ? 'text-emerald-400' :
                        'text-slate-500'
                      }`} />
                      <span className={feat.strong ? 'text-white font-semibold' : 'text-slate-300'}>
                        {feat.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.ctaHref}
                  className={`block w-full py-3 text-center rounded-xl font-bold text-sm transition ${
                    plan.highlight
                      ? 'bg-gold-500 hover:bg-gold-400 text-slate-950'
                      : plan.color === 'emerald'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
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
          <h2 className="text-3xl md:text-4xl font-black mb-4">Frequently Asked Questions</h2>
          <p className="text-slate-400">Everything you need to know before you start.</p>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-800/50 transition font-semibold"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className={`text-gold-400 transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-slate-800">
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
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            Ready to close more deals?
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Start with 500 free AI messages. No card. No risk. Just results.
          </p>
          <a href="/register?plan=free" className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-slate-950 font-black px-10 py-5 rounded-2xl text-xl transition-all hover:scale-105 shadow-2xl shadow-gold-500/30">
            <Sparkles className="w-6 h-6" />
            Start Free Today
          </a>
          <p className="mt-6 text-sm text-slate-600">
            Need a custom plan? <a href="mailto:support@outpilot.ae" className="text-gold-400 hover:underline">Contact sales →</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5 font-bold text-white">
            <div className="w-7 h-7 bg-gradient-to-br from-gold-500 to-gold-700 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Outpilot
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="/terms" className="hover:text-gold-400 transition">Terms & Conditions</a>
            <a href="/privacy" className="hover:text-gold-400 transition">Privacy Policy</a>
            <a href="mailto:support@outpilot.ae" className="hover:text-gold-400 transition">support@outpilot.ae</a>
          </div>
          <div className="text-sm text-slate-600">© 2026 Outpilot. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
