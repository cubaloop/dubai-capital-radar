import React, { useEffect, useState } from 'react';

export const DemoBanner: React.FC = () => {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasDemoParam = urlParams.get('demo') === 'true';
    const hasDemoStorage = localStorage.getItem('outpilot_demo_mode') === 'true';
    
    if (hasDemoParam) {
      localStorage.setItem('outpilot_demo_mode', 'true');
      setIsDemo(true);
    } else if (hasDemoStorage) {
      setIsDemo(true);
    }
  }, []);

  const exitDemo = () => {
    localStorage.removeItem('outpilot_demo_mode');
    setIsDemo(false);
    window.location.href = '/';
  };

  if (!isDemo) return null;

  return (
    <div className="bg-gold-500 text-slate-950 px-4 py-2 text-xs font-bold font-mono text-center flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 z-50 relative shadow-md">
      <span>🎯 DEMO MODE — You're viewing sample data. No real messages will be sent.</span>
      <div className="flex gap-3">
        <button onClick={exitDemo} className="underline hover:text-white transition">Exit Demo</button>
        <a href="#schedule" className="bg-slate-950 text-gold-500 px-3 py-1 rounded hover:bg-slate-800 transition">Schedule a Call</a>
      </div>
    </div>
  );
};
