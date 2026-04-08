import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
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
  const legacy = assets.filter(a => a.crypto_algorithm && (a.crypto_algorithm.includes('RSA-1024') || a.crypto_algorithm.includes('SHA-1'))).length;
  const standard = total - elite - critical - legacy >= 0 ? total - elite - critical - legacy : 0;

  const elitePct = Math.round((elite / total) * 100) || 0;
  const stdPct = Math.round((standard / total) * 100) || 0;
  const legacyPct = Math.round((legacy / total) * 100) || 0;
  const criticalPct = Math.round((critical / total) * 100) || 0;

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

  const doughnutOptions = { 
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: { legend: { display: false } } 
  };

  const barData = {
    labels: ['Elite', 'Critical', 'Std'],
    datasets: [{
      label: 'Assets',
      data: [elite, critical, standard],
      backgroundColor: ['#4ade80', '#ef4444', '#eab308'],
      borderWidth: 0
    }]
  };

  const doughnutData = {
    labels: ['Elite-PQC Ready', 'Standard', 'Legacy', 'Critical'],
    datasets: [{
      data: [elite, standard, legacy, critical],
      backgroundColor: ['#4ade80', '#eab308', '#f97316', '#7f1d1d'],
      borderWidth: 0
    }]
  };

  const activeApp = selectedAsset || (assets.length > 0 ? assets[0] : null);

  return (
    <div className="grid grid-cols-12 gap-5 auto-rows-min">
      {/* Top Banner */}
      <div className="col-span-12 bg-gradient-to-r from-[#81001d] to-[#a51c30]/90 rounded-2xl p-5 shadow-xl border border-outline-variant/30 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-widest uppercase">PQC Compliance Dashboard</h2>
          <p className="text-xs md:text-sm text-white/70 mt-1">Post-Quantum Cryptography readiness and cryptographic transition modeling.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold w-full lg:w-auto">
          <div className="bg-[#ecfdf5]/90 border border-[#a7f3d0]/30 text-[#059669] px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm flex-1 lg:flex-none justify-center">
             <span className="material-symbols-outlined text-[16px]">verified_user</span>
             <span className="uppercase tracking-wider">Elite-PQC Ready <span className="ml-1 text-sm">{elite}</span></span>
          </div>
          <div className="bg-surface-container text-on-surface px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm border border-outline-variant/30 flex-1 lg:flex-none justify-center">
             <span className="material-symbols-outlined text-[16px] text-secondary">stacked_line_chart</span>
             <span className="uppercase tracking-wider">Standard <span className="ml-1 text-sm text-secondary">{standard}</span></span>
          </div>
          <div className="bg-surface-container text-on-surface px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm border border-outline-variant/30 flex-1 lg:flex-none justify-center">
             <span className="material-symbols-outlined text-[16px] text-[#f97316]">warning</span>
             <span className="uppercase tracking-wider">Legacy <span className="ml-1 text-sm text-[#f97316]">{legacy}</span></span>
          </div>
          <div className="bg-[#fff1f2]/90 border border-[#fecdd3]/30 text-[#be123c] px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm flex-1 lg:flex-none justify-center">
             <span className="material-symbols-outlined text-[16px]">dns</span>
             <span className="uppercase tracking-wider">Critical Apps <span className="ml-1 text-sm">{critical}</span></span>
          </div>
        </div>
      </div>

      {/* Row 1 */}
      {/* Assets by Grade */}
      <div className="col-span-12 lg:col-span-4 glass-card p-5 rounded-2xl border border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col bg-surface min-h-[290px]">
        <h3 className="font-bold text-sm mb-5 text-secondary uppercase tracking-wider">Assets by Grade</h3>
        <div className="flex-1 w-full"><Bar data={barData} options={barOptions} /></div>
      </div>

      {/* Application Status */}
      <div className="col-span-12 lg:col-span-4 glass-card p-5 rounded-2xl border border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col bg-surface min-h-[290px]">
        <h3 className="font-bold text-sm mb-5 text-secondary uppercase tracking-wider">Application Status</h3>
        <div className="flex-1 w-full relative mb-5"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-medium text-on-surface mt-auto">
          <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#4ade80]"></span> Elite-PQC Ready</div> <span className="text-[#4ade80] font-bold">{elite}</span></div>
          <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#eab308]"></span> Standard</div> <span className="text-[#eab308] font-bold">{standard}</span></div>
          <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#f97316]"></span> Legacy</div> <span className="text-[#f97316] font-bold">{legacy}</span></div>
          <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#7f1d1d]"></span> Critical</div> <span className="text-[#7f1d1d] font-bold">{critical}</span></div>
        </div>
      </div>

      {/* Migration Readiness */}
      <div className="col-span-12 lg:col-span-4 glass-card p-5 rounded-2xl border border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col bg-surface min-h-[290px]">
        <h3 className="font-bold text-sm mb-1 text-secondary uppercase tracking-wider">Migration Readiness</h3>
        <p className="text-xs text-on-surface-variant mb-6">Progress towards PQC isolation.</p>
        
        <div className="space-y-6 mt-auto mb-2">
          <div>
            <div className="flex justify-between text-xs mb-2"><span className="text-on-surface font-medium">Secure and PQC Ready</span> <span><span className="text-[#4ade80] font-bold">{elite}</span> <span className="text-on-surface-variant ml-1 font-mono">({elitePct}%)</span></span></div>
            <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden"><div className="bg-[#4ade80] h-full" style={{width: `${elitePct}%`}}></div></div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2"><span className="text-on-surface font-medium">Moderate / Transition</span> <span><span className="text-[#eab308] font-bold">{standard}</span> <span className="text-on-surface-variant ml-1 font-mono">({stdPct}%)</span></span></div>
            <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden"><div className="bg-[#eab308] h-full" style={{width: `${stdPct}%`}}></div></div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-2"><span className="text-on-surface font-medium">High Risk / Vulnerable</span> <span><span className="text-[#ef4444] font-bold">{critical + legacy}</span> <span className="text-on-surface-variant ml-1 font-mono">({criticalPct + legacyPct}%)</span></span></div>
            <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden"><div className="bg-[#ef4444] h-full" style={{width: `${criticalPct + legacyPct}%`}}></div></div>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      {/* Asset Inventory */}
      <div className="col-span-12 lg:col-span-4 glass-card p-5 rounded-2xl border border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col bg-surface min-h-[340px] max-h-[380px]">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-bold text-sm text-secondary uppercase tracking-wider">Asset Inventory</h3>
          <span className="text-xs text-on-surface-variant font-medium">{assets.length > 0 ? assets.length : total} Selected</span>
        </div>
        <div className="text-xs font-bold text-secondary mb-3 px-2 uppercase tracking-wider border-b border-outline-variant/20 pb-2">HostName / IP</div>
        <div className="overflow-y-auto flex-1 space-y-1.5 pr-2 custom-scrollbar">
          {assets.map((asset, i) => (
            <div 
              key={i} 
              className={`p-2.5 rounded-xl cursor-pointer transition-colors ${activeApp === asset ? 'bg-secondary/10 border-l-4 border-secondary' : 'hover:bg-surface-variant/50 border-l-4 border-transparent'}`}
               onClick={() => setSelectedAsset(asset)}
            >
              <div className="font-bold text-on-surface text-sm">{asset.domain || `Asset ${i+1}`}</div>
              <div className="text-xs text-on-surface-variant mt-1 font-mono opacity-80">{asset.ip || 'Unknown IP'}{asset.port ? `:${asset.port}` : ':443'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Deep Dive */}
      <div className="col-span-12 lg:col-span-4 glass-card p-5 rounded-2xl border border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col bg-surface min-h-[340px]">
        <h3 className="font-bold text-sm mb-5 text-secondary uppercase tracking-wider">Asset Deep Dive</h3>
        {activeApp ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-4 mb-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 shadow-sm">
              <div className="w-12 h-12 bg-[#81001d] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-inner">
                {(activeApp.domain ? activeApp.domain.charAt(0) : 'A').toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-on-surface text-[15px] truncate">{activeApp.domain || 'Unknown Host'}</div>
                <div className="text-xs text-on-surface-variant font-mono mt-1 opacity-80">{activeApp.ip || 'Unknown IP'}{activeApp.port ? `:${activeApp.port}` : ':443'}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 flex-1 h-full">
              <div className="bg-surface-container-low p-3 md:p-4 rounded-xl border border-outline-variant/20 flex flex-col justify-center">
                 <div className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider mb-1.5 opacity-80">Type</div>
                 <div className="text-base font-bold text-secondary capitalize">{activeApp.type || activeApp.device_type || 'Web Server'}</div>
              </div>
              <div className="bg-surface-container-low p-3 md:p-4 rounded-xl border border-outline-variant/20 flex flex-col justify-center">
                 <div className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider mb-1.5 opacity-80">TLS</div>
                 <div className="text-base font-bold text-on-surface">{activeApp.tls_version || activeApp.crypto_algorithm || 'TLSv1.3'}</div>
              </div>
              <div className="bg-surface-container-low p-3 md:p-4 rounded-xl border border-outline-variant/20 flex flex-col justify-center col-span-2">
                 <div className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider mb-1.5 opacity-80">Risk</div>
                 <div className={`text-base font-bold capitalize ${
                   ((activeApp.risk_level || '').toLowerCase() === 'high' || (activeApp.risk_level || '').toLowerCase() === 'critical') ? 'text-[#ef4444]' : 
                   ((activeApp.risk_level || '').toLowerCase() === 'medium' || (activeApp.risk_level || '').toLowerCase() === 'moderate') ? 'text-[#eab308]' : 
                   'text-[#4ade80]'
                 }`}>{activeApp.risk_level || 'Moderate'}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant italic border-2 border-dashed border-outline-variant/20 rounded-xl">Select an asset</div>
        )}
      </div>

      {/* Priority Actions */}
      <div className="col-span-12 lg:col-span-4 glass-card p-5 rounded-2xl border border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col bg-surface min-h-[340px] max-h-[380px]">
        <h3 className="font-bold text-sm mb-5 text-secondary uppercase tracking-wider">Priority Actions</h3>
        <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar flex-1">
          {recommendations.slice(0,5).map((rec, i) => {
             const title = typeof rec === 'string' ? rec : rec.title;
             const isHigh = title.toLowerCase().includes('tls') || title.toLowerCase().includes('kyber') || title.toLowerCase().includes('upgrade');
             return (
               <div key={i} className={`p-4 rounded-xl flex items-start gap-4 border ${isHigh ? 'bg-[#ef4444]/5 border-[#ef4444]/20' : 'bg-surface-variant/30 border-outline-variant/20'}`}>
                 <span className={`material-symbols-outlined mt-0.5 text-[20px] ${isHigh ? 'text-[#ef4444]' : 'text-[#eab308]'}`}>
                   {title.toLowerCase().includes('kyber') ? 'key' : title.toLowerCase().includes('upgrade') ? 'security' : 'build'}
                 </span>
                 <div>
                   <div className="text-sm font-bold text-on-surface leading-tight">{title}</div>
                   <div className={`text-[11px] font-bold mt-1.5 uppercase tracking-wide ${isHigh ? 'text-[#ef4444]' : 'text-[#eab308]'}`}>
                     {isHigh ? 'High Priority' : 'Medium Priority'}
                   </div>
                 </div>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
}
