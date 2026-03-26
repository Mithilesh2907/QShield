import { useState } from 'react';

export default function TopBar({ onScan }) {
  const [domain, setDomain] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && domain.trim()) {
      onScan(domain.trim());
    }
  };

  return (
    <header className="fixed top-0 right-0 left-64 h-16 flex items-center justify-between px-8 z-40 bg-[#fef8f3]/80 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <h2 className="font-inter text-lg font-bold text-[#594141]">Security Command Center</h2>
        <span className="h-4 w-[1px] bg-outline-variant/30"></span>
        <span className="text-xs font-bold uppercase tracking-widest text-secondary">Operational Mode</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">search</span>
          <input
            className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-secondary/20 w-64"
            placeholder="Scan domain (e.g. example.com)..."
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <button className="material-symbols-outlined hover:text-secondary transition-colors">notifications</button>
          <button className="material-symbols-outlined hover:text-secondary transition-colors">help_outline</button>
          <div className="h-8 w-8 rounded-full bg-primary-container overflow-hidden ring-2 ring-white shadow-sm">
            <img alt="Admin User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI1xeVQb-lbsfGm_1pD2jJVu91VHZjIqoFxvsH_pf5-RAzdw3fUUV8kwk3o4FFp_U2tTxT9KWLX9w6ZjAnkwXk09adXdPhPaOghROJcPuFcxr42btjE9jBYBjNXp5Jnc_Y5RIbBfgWqCT7-_NiLeQuFNRq1-zaY-hk1hkvWyPbCsdhetULrPe9tW_ncKRhzLtuD1pmqKYy4N7xFXCjMi_r8DCDXMF853qh3z0UXnIw3SovrfHpL2LoP1c59PYT1l124X6gFrg5QG8" />
          </div>
        </div>
      </div>
    </header>
  );
}
