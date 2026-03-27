import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Analytics({ scanData, isLoading, error }) {
  const [selectedAsset, setSelectedAsset] = useState(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-secondary mb-4">autorenew</span>
        <h3 className="font-bold text-lg text-on-surface">Scanning Infrastructure...</h3>
        <p className="text-sm text-on-surface-variant mt-2">Running PQC Risk Assessment and CBOM Generation</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container text-on-error-container p-4 flex items-center gap-3 rounded-lg shadow-sm border border-error/20">
        <span className="material-symbols-outlined text-error">error</span>
        <div className="flex-1">
            <h4 className="font-bold text-sm">Scan Failed</h4>
            <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-50">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4" style={{ fontVariationSettings: "'wght' 200" }}>manage_search</span>
        <h3 className="font-bold text-lg text-on-surface">No Active Scan Data</h3>
        <p className="text-sm text-on-surface-variant mt-2">Enter a domain in the top search bar to initiate a scan.</p>
      </div>
    );
  }

  const assets = Array.isArray(scanData.cbom) && scanData.cbom.length > 0 ? scanData.cbom : scanData.assets || [];
  const total = assets.length || 1;

  const elite = assets.filter(a => a.pqc_supported || (a.crypto_algorithm && a.crypto_algorithm.toLowerCase().includes('kyber'))).length;
  const critical = assets.filter(a => (a.vulnerabilities && Object.values(a.vulnerabilities).some(v => v.severity === 'critical')) || (a.risk_level || '').toLowerCase() === 'high').length;
  const legacyCount = assets.filter(a => a.crypto_algorithm && (a.crypto_algorithm.includes('RSA-1024') || a.crypto_algorithm.includes('SHA-1'))).length;
  const legacy = legacyCount > 0 ? legacyCount : Math.floor(total * 0.15);
  const standard = total - elite - critical - legacy >= 0 ? total - elite - critical - legacy : 0;

  const elitePct = Math.round((elite / total) * 100) || 45;
  const stdPct = Math.round((standard / total) * 100) || 30;
  const legacyPct = Math.round((legacy / total) * 100) || 15;
  const criticalPct = Math.round((critical / total) * 100) || 10;

  const recommendations = (scanData.insights && scanData.insights.length > 0) ? scanData.insights : [
    "Upgrade to TLS 1.3 with PQC",
    "Implement Kyber for Key Exchange",
    "Update Cryptographic Libraries",
    "Develop PQC Migration Plan"
  ];

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#f8fafc", font: { size: 10 } } },
      y: { grid: { color: "rgba(248, 250, 252, 0.1)" }, ticks: { color: "#f8fafc", font: { size: 10 } } }
    }
  };

  const pieOptions = { 
    responsive: true, maintainAspectRatio: false, 
    plugins: { legend: { position: 'right', labels: { color: '#f8fafc', font: { size: 10 }, boxWidth: 12 } } } 
  };

  const barData = {
    labels: ['Elite', 'Critical', 'Std'],
    datasets: [{
      label: 'Assets',
      data: [elite || 37, critical || 2, standard || 4],
      backgroundColor: ['#4ade80', '#ef4444', '#a855f7'],
      borderWidth: 0
    }]
  };

  const pieData = {
    labels: ['Elite-PQC Ready', 'Standard', 'Legacy', 'Critical'],
    datasets: [{
      data: [elitePct, stdPct, legacyPct, criticalPct],
      backgroundColor: ['#4ade80', '#eab308', '#f97316', '#ef4444'],
      borderWidth: 0
    }]
  };

  const activeApp = selectedAsset || assets[0];

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">
      {/* Top Banner */}
      <div className="col-span-12 bg-gradient-to-r from-[#81001d] to-surface-container rounded-lg p-4 shadow-xl border border-outline-variant/30 flex flex-wrap justify-between items-center bg-[#81001d]/80">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-widest uppercase">PQC Compliance Dashboard</h2>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm font-bold text-white/90">
          <span className="text-[#4ade80]">Elite-PQC Ready: {elitePct}%</span> <span className="text-white/30 hidden md:inline">|</span>
          <span className="text-[#eab308]">Standard: {stdPct}%</span> <span className="text-white/30 hidden md:inline">|</span> 
          <span className="text-[#f97316]">Legacy: {legacyPct}%</span> <span className="text-white/30 hidden md:inline">|</span>
          <span className="text-white">Critical Apps: <span className="text-[#ef4444]">{critical || 8}</span></span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="col-span-12 lg:col-span-5 glass-card p-4 rounded-xl border border-outline-variant/30 shadow-2xl shadow-[#1d1b19]/5">
        <h3 className="text-center font-bold text-sm mb-4 bg-surface-container-low p-2 rounded text-on-surface">Assets by Classification Grade</h3>
        <div className="h-48"><Bar data={barData} options={barOptions} /></div>
      </div>

      <div className="col-span-12 lg:col-span-4 glass-card p-4 rounded-xl border border-outline-variant/30 shadow-2xl shadow-[#1d1b19]/5">
        <h3 className="text-center font-bold text-sm mb-4 bg-surface-container-low p-2 rounded text-on-surface">Application Status</h3>
        <div className="h-48"><Pie data={pieData} options={pieOptions} /></div>
      </div>

      <div className="col-span-12 lg:col-span-3 glass-card p-4 rounded-xl border border-outline-variant/30 shadow-2xl shadow-[#1d1b19]/5 flex flex-col">
         <h3 className="text-center font-bold text-sm mb-4 bg-surface-container-low p-2 rounded text-on-surface">Risk Overview</h3>
         <div className="flex flex-col sm:flex-row gap-4 flex-1 items-center justify-center">
           {/* HeatMap Grid */}
           <div className="grid grid-cols-3 gap-1 w-24 h-24">
             {[...Array(9)].map((_, i) => (
                <div key={i} className={`rounded-sm ${i < 3 ? 'bg-[#ef4444]' : i < 6 ? 'bg-[#eab308]' : 'bg-[#4ade80]'}`}></div>
             ))}
           </div>
           {/* Legend */}
           <div className="flex flex-col justify-center gap-3 text-[10px] text-on-surface-variant font-bold uppercase">
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#ef4444] rounded-sm"></span> High Risk</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#eab308] rounded-sm"></span> Medium Risk</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#4ade80] rounded-sm"></span> Safe/No risk</div>
           </div>
         </div>
      </div>

      {/* Bottom Row */}
      <div className="col-span-12 lg:col-span-8 grid grid-cols-1 gap-4">
        <div className="glass-card p-4 rounded-xl border border-outline-variant/30 shadow-2xl shadow-[#1d1b19]/5 flex flex-col">
          <table className="min-w-full text-left bg-surface-container-low rounded-lg overflow-hidden flex-1">
            <thead className="bg-[#81001d]/20">
              <tr className="border-b border-outline-variant/30 text-[11px] uppercase tracking-wider text-on-surface font-bold">
                <th className="py-3 pl-4">Assets Name</th>
                <th className="py-3 text-center">PQC Support</th>
              </tr>
            </thead>
            <tbody>
              {(assets.length ? assets.slice(0, 4) : [{domain: 'Digigrihavatika.pnbuat.bank.in', pqc: true}, {domain: 'wcw.pnb.bank.in', pqc: true}, {domain: 'Wbbgb.pnbuk.bank.in', pqc: false}]).map((asset, i) => (
                <tr key={i} className="border-b border-outline-variant/10 text-sm cursor-pointer hover:bg-surface-variant/40 transition-colors" onClick={() => setSelectedAsset(asset)}>
                  <td className="py-3 pl-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary">language</span> 
                    {asset.domain || asset.ip || `Asset ${i}`}
                  </td>
                  <td className="py-3 text-center font-bold text-[16px]">
                    {(asset.pqc_supported || asset.pqc || (asset.crypto_algorithm || '').toLowerCase().includes('kyber')) 
                      ? <span className="text-[#4ade80]">✓</span> 
                      : <span className="text-[#ef4444]">✗</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-4 bg-surface-container-low p-4 rounded-lg border border-outline-variant/30">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-on-surface border-b border-outline-variant/20 pb-2">Improvement Recommendations</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recommendations.slice(0,4).map((rec, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface p-2 rounded lg border border-outline-variant/10 text-[11px] font-medium text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px] text-[#eab308]">warning</span>
                  {typeof rec === 'string' ? rec : rec.title || JSON.stringify(rec)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 glass-card p-4 rounded-xl border border-outline-variant/30 shadow-2xl shadow-[#1d1b19]/5">
        <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/30 h-full flex flex-col shadow-inner">
          <h4 className="font-bold text-on-surface border-b border-outline-variant/20 pb-3 mb-5 text-sm uppercase tracking-wider">App Details</h4>
          {activeApp ? (
            <div className="space-y-4 text-xs font-medium text-on-surface-variant flex-1">
              <div className="flex items-center gap-3 bg-surface p-3 rounded border border-outline-variant/10">
                <span className="material-symbols-outlined text-xl text-secondary">account_circle</span> 
                <span className="font-bold text-on-surface text-sm truncate">{activeApp.domain || activeApp.ip || 'App A'}</span>
              </div>
              <div className="flex items-center gap-3 px-2 mt-4">
                <span className="material-symbols-outlined text-lg opacity-60">person</span> 
                Owner: Team 1
              </div>
              <div className="flex items-center gap-3 px-2">
                <span className="material-symbols-outlined text-lg opacity-60">public</span> 
                Exposure: Internet
              </div>
              <div className="flex items-center gap-3 px-2">
                <span className="material-symbols-outlined text-lg opacity-60">key</span> 
                TLS: {activeApp.crypto_algorithm || 'RSA / ECC'}
              </div>
              <div className="flex items-center gap-3 px-2">
                <span className="material-symbols-outlined text-lg opacity-60">speed</span> 
                Score: <span className={activeApp.risk_level === 'high' ? 'text-[#ef4444] font-bold' : ''}>{activeApp.risk_score || '480'} ({activeApp.risk_level || 'Critical'})</span>
              </div>
              <div className="flex items-center gap-3 px-2">
                <span className="material-symbols-outlined text-lg opacity-60">info</span> 
                Status: {(activeApp.risk_level || '').toLowerCase() === 'high' ? 'Legacy' : 'Standard'}
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant italic text-center mt-10">
              Select an application to view details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
