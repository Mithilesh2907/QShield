import { useState, useMemo } from 'react';
import {
  Chart as ChartJS, ArcElement, BarElement,
  CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/* ── helpers ── */
const getMappedType = (t) => {
  const s = (t || '').toLowerCase();
  if (s === 'web') return 'Web Server';
  if (s === 'api') return 'Api';
  if (s === 'server') return 'Web Server';
  if (s === 'domain') return 'Domain';
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Unknown';
};

const typeColor = (t) => {
  const s = (t || '').toLowerCase();
  if (s.includes('web')) return 'bg-blue-100 text-blue-800';
  if (s.includes('api')) return 'bg-purple-100 text-purple-800';
  if (s.includes('domain')) return 'bg-green-100 text-green-800';
  return 'bg-gray-100 text-gray-700';
};

const strengthColor = (s) => {
  const n = (s || '').toUpperCase();
  if (n === 'STRONG') return 'bg-green-100 text-green-800';
  if (n === 'MODERATE') return 'bg-[#fbf5e6] text-[#b07d12]';
  if (n === 'WEAK') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-600';
};

const strengthLabel = (s) => {
  const n = (s || '').toUpperCase();
  if (n === 'STRONG') return 'Strong';
  if (n === 'MODERATE') return 'Moderate';
  if (n === 'WEAK') return 'Weak';
  return 'Unknown';
};

const tlsColor = (v) => {
  if (!v || v === 'Unknown' || v === 'Not Supported') return 'text-red-600';
  if (v === 'TLSv1.3') return 'text-green-700';
  if (v === 'TLSv1.2') return 'text-amber-700';
  return 'text-red-600';
};

const StatChip = ({ icon, label, value, color = 'text-[#721c24]' }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e5dfd3] bg-white/80 text-sm font-semibold shadow-sm">
    <span className="material-symbols-outlined text-[15px] text-on-surface-variant">{icon}</span>
    <span className="text-on-surface-variant text-[12px] tracking-wide">{label}</span>
    <span className={`font-black text-[13px] ml-0.5 ${color}`}>{value}</span>
  </div>
);

const SummaryKPI = ({ value, label, color = '#721c24', accent }) => (
  <div
    className="flex-1 min-w-[140px] rounded-xl p-4 border border-[#e5dfd3] shadow-sm relative overflow-hidden"
    style={{ background: 'linear-gradient(135deg, #fdfbf6 0%, #f8f4ec 100%)' }}
  >
    {accent && <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl" style={{ background: accent }} />}
    <div className="text-[32px] font-black leading-none mb-1" style={{ color }}>{value}</div>
    <div className="text-[12px] text-on-surface-variant font-semibold tracking-wide">{label}</div>
  </div>
);

/* ── Chart configs ── */
const miniDonutOpts = (colors) => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { position: 'bottom', labels: { color: '#475569', font: { size: 10, weight: 600 }, boxWidth: 10, padding: 8 } },
    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}` } }
  }
});

const barOpts = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 10 } } },
    y: { grid: { display: false }, ticks: { color: '#334155', font: { size: 10, weight: 600 }, padding: 2 } }
  },
  plugins: { legend: { display: false } }
};

const keyLenBarOpts = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 10 } } },
    y: { grid: { color: 'rgba(181,10,46,0.06)' }, ticks: { color: '#475569', font: { size: 10 } } }
  },
  plugins: { legend: { display: false } }
};

const CardTitle = ({ children }) => (
  <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-[#721c24] mb-3">{children}</h3>
);

const ChartCard = ({ title, children, className = '' }) => (
  <div
    className={`rounded-xl border border-[#e5dfd3] shadow-sm p-4 ${className}`}
    style={{ background: 'linear-gradient(135deg, #fdfbf6 0%, #f8f4ec 100%)' }}
  >
    <CardTitle>{title}</CardTitle>
    {children}
  </div>
);

export default function CBOM({ scanData, isLoading, error }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <span className="material-symbols-outlined animate-spin text-4xl text-secondary mb-4">autorenew</span>
      <h3 className="font-bold text-lg text-on-surface">Generating CBOM...</h3>
    </div>
  );

  if (error) return (
    <div className="bg-error-container text-on-error-container p-4 flex items-center gap-3 rounded-lg">
      <span className="material-symbols-outlined text-error">error</span>
      <p className="text-xs">{error}</p>
    </div>
  );

  if (!scanData) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-50">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">inventory</span>
      <h3 className="font-bold text-lg text-on-surface">No Data Available</h3>
      <p className="text-sm text-on-surface-variant mt-2">Run a scan to generate the Cryptographic Bill of Materials.</p>
    </div>
  );

  const cbom = Array.isArray(scanData.cbom) && scanData.cbom.length > 0 ? scanData.cbom : scanData.assets || [];

  /* ── Derived stats ── */
  const totalAssets = cbom.length;
  const weakCount = cbom.filter(a => (a.key_strength || '').toUpperCase() === 'WEAK').length;
  const certIssues = cbom.filter(a => ['EXPIRED', 'WARNING', 'CRITICAL', 'NO_TLS', 'NO_CERT'].includes((a.certificate_status || '').toUpperCase())).length;
  const apiCount = cbom.filter(a => (a.type || '').toLowerCase() === 'api').length;
  const quantumVulnCount = cbom.filter(a => a.quantum_vulnerable === true).length;
  const outdatedCount = cbom.filter(a => a.outdated_services).length;
  const highRiskCount = cbom.filter(a => a.risk_level === 'High').length;
  const httpsCount = cbom.filter(a => a.ports?.['443']).length;

  /* ── Key Length Distribution ── */
  const keyLenGroups = useMemo(() => {
    const g = {};
    cbom.forEach(a => {
      const k = a.key_size ? `${a.key_size}` : 'Unknown';
      g[k] = (g[k] || 0) + 1;
    });
    return g;
  }, [cbom]);
  const keyLenLabels = Object.keys(keyLenGroups).sort((a, b) => parseInt(a) - parseInt(b));
  const keyLenData = {
    labels: keyLenLabels,
    datasets: [{
      data: keyLenLabels.map(k => keyLenGroups[k]),
      backgroundColor: 'rgba(181,10,46,0.75)',
      borderColor: '#B50A2E',
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  /* ── Cipher Suite Usage ── */
  const cipherGroups = useMemo(() => {
    const g = {};
    cbom.forEach(a => {
      const c = a.cipher || 'Unknown';
      g[c] = (g[c] || 0) + 1;
    });
    return Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [cbom]);
  const maxCipher = cipherGroups[0]?.[1] || 1;

  /* ── Cipher Strength Breakdown ── */
  const strengthGroups = useMemo(() => {
    const g = { Strong: 0, Moderate: 0, Weak: 0, Unknown: 0 };
    cbom.forEach(a => {
      const s = (a.key_strength || '').toUpperCase();
      if (s === 'STRONG') g.Strong++;
      else if (s === 'MODERATE') g.Moderate++;
      else if (s === 'WEAK') g.Weak++;
      else g.Unknown++;
    });
    return g;
  }, [cbom]);
  const strengthDonutData = {
    labels: ['Strong', 'Moderate', 'Weak', 'Unknown'],
    datasets: [{
      data: [strengthGroups.Strong, strengthGroups.Moderate, strengthGroups.Weak, strengthGroups.Unknown],
      backgroundColor: ['#22c55e', '#FABC0A', '#ef4444', '#94a3b8'],
      borderWidth: 2,
      borderColor: '#fdfbf6',
      hoverOffset: 6,
    }]
  };

  /* ── Asset Type Distribution ── */
  const typeGroups = useMemo(() => {
    const g = {};
    cbom.forEach(a => {
      const t = getMappedType(a.type);
      g[t] = (g[t] || 0) + 1;
    });
    return g;
  }, [cbom]);
  const typeColors = ['#3b82f6', '#10b981', '#FABC0A', '#a855f7', '#f97316', '#94a3b8'];
  const typeLabels = Object.keys(typeGroups);
  const typeDonutData = {
    labels: typeLabels,
    datasets: [{
      data: typeLabels.map(t => typeGroups[t]),
      backgroundColor: typeColors.slice(0, typeLabels.length),
      borderWidth: 2,
      borderColor: '#fdfbf6',
      hoverOffset: 6,
    }]
  };

  /* ── Top Certificate Authorities ── */
  const caGroups = useMemo(() => {
    const g = {};
    cbom.forEach(a => {
      const ca = a.certificate?.issuer_ca || a.issuer || 'Other';
      const short = ca.length > 22 ? ca.slice(0, 22) + '...' : ca;
      g[short] = (g[short] || 0) + 1;
    });
    return Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [cbom]);
  const maxCA = caGroups[0]?.[1] || 1;

  /* ── TLS Protocol Distribution ── */
  const tlsGroups = useMemo(() => {
    const g = {};
    cbom.forEach(a => {
      const v = a.tls_version || 'Unknown';
      g[v] = (g[v] || 0) + 1;
    });
    return g;
  }, [cbom]);
  const tlsColors = { 'TLSv1.3': '#22c55e', 'TLSv1.2': '#FABC0A', 'TLSv1.1': '#f97316', 'TLSv1': '#ef4444', 'Not Supported': '#94a3b8', 'Unknown': '#cbd5e1' };
  const tlsLabels = Object.keys(tlsGroups);
  const tlsDonutData = {
    labels: tlsLabels,
    datasets: [{
      data: tlsLabels.map(t => tlsGroups[t]),
      backgroundColor: tlsLabels.map(t => tlsColors[t] || '#cbd5e1'),
      borderWidth: 2,
      borderColor: '#fdfbf6',
      hoverOffset: 6,
    }]
  };

  /* ── Table filter ── */
  const filtered = cbom.filter(a =>
    (a.domain || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.cipher || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black text-[#721c24] tracking-tight">Cryptographic Bill of Materials (CBOM)</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Comprehensive overview of cryptographic assets and vulnerabilities.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatChip icon="bug_report"      label="Quantum Vulnerable" value={quantumVulnCount} color="text-red-700" />
          <StatChip icon="construction"    label="Outdated Services"  value={outdatedCount}    color="text-amber-700" />
          <StatChip icon="warning"         label="High Risk"          value={highRiskCount}    color="text-red-700" />
          <StatChip icon="https"           label="HTTPS Enabled"      value={httpsCount}       color="text-green-700" />
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="flex flex-wrap gap-3">
        <SummaryKPI value={totalAssets}         label="Total Applications"  color="#1d4ed8" accent="#3b82f6" />
        <SummaryKPI value={weakCount}           label="Weak Cryptography"   color="#b07d12" accent="#FABC0A" />
        <SummaryKPI value={certIssues}          label="Certificate Issues"  color="#B50A2E" accent="#B50A2E" />
        <SummaryKPI value={apiCount}            label="API Assets"          color="#7c3aed" accent="#a855f7" />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Key Length Distribution */}
        <ChartCard title="Key Length Distribution">
          <div className="h-[180px]">
            <Bar data={keyLenData} options={keyLenBarOpts} />
          </div>
        </ChartCard>

        {/* Cipher Suite Usage */}
        <ChartCard title="Cipher Suite Usage">
          <div className="space-y-2">
            {cipherGroups.map(([cipher, count], i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-mono text-on-surface truncate max-w-[170px]" title={cipher}>{cipher}</span>
                  <span className="font-black text-[#721c24] ml-2">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#e5dfd3] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxCipher) * 100}%`, background: i === 0 ? '#3b82f6' : i === 1 ? '#10b981' : '#FABC0A' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Cipher Strength Breakdown */}
        <ChartCard title="Cipher Strength Breakdown">
          <div className="h-[140px]">
            <Doughnut data={strengthDonutData} options={miniDonutOpts()} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] font-bold">
            <span className="text-green-700">Strong <span className="font-black">{strengthGroups.Strong}</span></span>
            <span className="text-[#b07d12]">Moderate <span className="font-black">{strengthGroups.Moderate}</span></span>
            <span className="text-red-700">Weak <span className="font-black">{strengthGroups.Weak}</span></span>
            <span className="text-gray-500">Unknown <span className="font-black">{strengthGroups.Unknown}</span></span>
          </div>
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Asset Type Distribution */}
        <ChartCard title="Asset Type Distribution">
          <div className="h-[160px]">
            <Doughnut data={typeDonutData} options={miniDonutOpts()} />
          </div>
        </ChartCard>

        {/* Top Certificate Authorities */}
        <ChartCard title="Top Certificate Authorities">
          <div className="space-y-2.5">
            {caGroups.map(([ca, count], i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-on-surface font-semibold truncate max-w-[170px]" title={ca}>{ca}</span>
                  <span className="font-black text-[#721c24] ml-2">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#e5dfd3] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(count / maxCA) * 100}%`, background: i === 0 ? '#FABC0A' : '#3b82f6' }}
                  />
                </div>
              </div>
            ))}
            {caGroups.length === 0 && <p className="text-xs text-on-surface-variant">No CA data available.</p>}
          </div>
        </ChartCard>

        {/* TLS Protocol Distribution */}
        <ChartCard title="Encryption Protocols">
          <div className="h-[160px]">
            <Doughnut data={tlsDonutData} options={miniDonutOpts()} />
          </div>
        </ChartCard>
      </div>

      {/* ── Infrastructure Protection Overview ── */}
      <div
        className="rounded-xl border border-[#e5dfd3] shadow-sm p-4"
        style={{ background: 'linear-gradient(135deg, #fdfbf6 0%, #f8f4ec 100%)' }}
      >
        <CardTitle>Infrastructure Protection Overview</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: 'cloud', label: 'CDN Protected', sub: 'Served via content networks', value: 0, color: '#3b82f6' },
            { icon: 'security', label: 'WAF Guarded', sub: 'Behind app firewall', value: 0, color: '#FABC0A' },
            { icon: 'hub', label: 'HTTPS Secured', sub: 'TLS/SSL enabled endpoints', value: httpsCount, color: '#22c55e' },
          ].map(({ icon, label, sub, value, color }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[28px]" style={{ color }}>{icon}</span>
              <div>
                <span className="text-[22px] font-black" style={{ color }}>{value}</span>
                <div className="text-sm font-bold text-on-surface leading-tight">{label}</div>
                <div className="text-[11px] text-on-surface-variant">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CBOM Detail Table ── */}
      <div
        className="rounded-xl border border-[#e5dfd3] shadow-sm overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #fdfbf6 0%, #f8f4ec 100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5dfd3]">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#721c24]">CBOM Application Detail</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#e5dfd3] bg-white/60 focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
              />
            </div>
            <span className="text-[11px] font-bold text-on-surface-variant">{filtered.length} Assets</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e5dfd3]">
                {['Application', 'Type', 'Key Len', 'Strength', 'Cipher Suite', 'CA', 'TLS', 'Risk', 'Quantum'].map(h => (
                  <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#721c24] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5dfd3]">
              {filtered.length > 0 ? filtered.map((asset, i) => {
                const type = getMappedType(asset.type);
                const strength = strengthLabel(asset.key_strength);
                const ca = asset.certificate?.issuer_ca || asset.issuer || 'Other';
                const caShort = ca.length > 14 ? ca.slice(0, 14) + '…' : ca;
                return (
                  <tr key={i} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-4 py-3 text-[12px] font-bold text-blue-700 whitespace-nowrap max-w-[160px] truncate" title={asset.domain}>
                      {asset.domain || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${typeColor(type)}`}>{type}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-bold text-blue-700 whitespace-nowrap">
                      {asset.key_size ? `${asset.key_size}-Bit` : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${strengthColor(asset.key_strength)}`}>{strength}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-on-surface whitespace-nowrap max-w-[180px] truncate" title={asset.cipher}>
                      {asset.cipher || <span className="text-gray-400">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-on-surface-variant whitespace-nowrap" title={ca}>
                      {caShort}
                    </td>
                    <td className={`px-4 py-3 text-[11px] font-bold whitespace-nowrap ${tlsColor(asset.tls_version)}`}>
                      {asset.tls_version || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
                        asset.risk_level === 'High' ? 'bg-red-100 text-red-800' :
                        asset.risk_level === 'Medium' ? 'bg-[#fbf5e6] text-[#b07d12]' :
                        'bg-green-100 text-green-800'
                      }`}>{asset.risk_level || 'Unknown'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {asset.quantum_vulnerable === true
                        ? <span className="text-red-600 text-[11px] font-bold">Vulnerable</span>
                        : asset.quantum_vulnerable === false
                          ? <span className="text-green-700 text-[11px] font-bold">Safe</span>
                          : <span className="text-gray-400 text-[11px]">—</span>
                      }
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-on-surface-variant text-sm">
                    No matching results for "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
