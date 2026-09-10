import React, { useState, useEffect } from 'react';
import { BarChart3, Users, MessageSquare, CalendarCheck, TrendingUp } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('30');
  
  // Mock data for graceful UI
  const stats = {
    leads: 1245,
    sent: 8930,
    responseRate: 24.5,
    appointments: 56
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Analytics Overview</h1>
          <p className="text-sm text-slate-500">Track your campaign performance and conversions.</p>
        </div>
        <select 
          value={dateRange} 
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold shadow-sm"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: stats.leads, icon: <Users className="text-blue-500 w-5 h-5" />, trend: '+12%' },
          { label: 'Messages Sent', value: stats.sent, icon: <MessageSquare className="text-emerald-500 w-5 h-5" />, trend: '+8%' },
          { label: 'Response Rate', value: `${stats.responseRate}%`, icon: <BarChart3 className="text-gold-500 w-5 h-5" />, trend: '+2.1%' },
          { label: 'Active Appointments', value: stats.appointments, icon: <CalendarCheck className="text-purple-500 w-5 h-5" />, trend: '+5' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">{kpi.icon}</div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{kpi.trend}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 mb-1">{kpi.value}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-6">Conversion Funnel</h2>
        <div className="space-y-4">
          {[
            { stage: 'Created', count: 1245, pct: 100, color: 'bg-slate-200' },
            { stage: 'Contacted', count: 980, pct: 78, color: 'bg-blue-200' },
            { stage: 'Interested', count: 310, pct: 25, color: 'bg-gold-200' },
            { stage: 'Appointment', count: 56, pct: 4.5, color: 'bg-purple-200' },
            { stage: 'Won', count: 12, pct: 0.9, color: 'bg-emerald-200' }
          ].map((s, i) => (
            <div key={i} className="flex items-center text-sm">
              <div className="w-24 font-bold text-slate-600">{s.stage}</div>
              <div className="flex-1 ml-4 mr-4 bg-slate-50 rounded-full h-8 overflow-hidden relative border border-slate-100">
                <div className={`h-full ${s.color} transition-all`} style={{ width: `${s.pct}%` }}></div>
                <div className="absolute inset-0 flex items-center px-4 font-bold text-slate-800 text-xs">{s.count}</div>
              </div>
              <div className="w-12 text-right text-slate-400">{s.pct}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Campaign Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="pb-3 font-bold">Campaign Name</th>
                  <th className="pb-3 font-bold">Leads</th>
                  <th className="pb-3 font-bold">Sent</th>
                  <th className="pb-3 font-bold">Response Rate</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: 'Q3 Outbound B2B', l: 450, s: 420, r: '28%' },
                  { n: 'Webinar Follow-up', l: 120, s: 120, r: '45%' },
                  { n: 'Cold List - Tech', l: 675, s: 350, r: '12%' }
                ].map((c, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-slate-900">{c.n}</td>
                    <td className="py-3 text-slate-600">{c.l}</td>
                    <td className="py-3 text-slate-600">{c.s}</td>
                    <td className="py-3 font-bold text-emerald-600">{c.r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { a: 'Campaign "Q3 Outbound" finished sending', t: '10 min ago' },
              { a: 'New reply from Alex Johnson', t: '25 min ago' },
              { a: 'Meeting booked with TechCorp', t: '1 hr ago' },
              { a: '500 leads uploaded to "Cold List"', t: '3 hrs ago' },
              { a: 'Campaign "Webinar" started', t: '5 hrs ago' }
            ].map((act, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="mt-1"><TrendingUp className="w-4 h-4 text-slate-400" /></div>
                <div>
                  <div className="text-slate-800 font-medium">{act.a}</div>
                  <div className="text-slate-400 text-xs">{act.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
