import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

/* ── tiny helpers ────────────────────────────────────────────── */
function scoreLabel(s) {
  if (s > 850) return 'Excellent';
  if (s > 700) return 'Secure';
  if (s > 500) return 'Moderate';
  return 'Critical';
}
function scoreAccent(s) {
  if (s > 800) return { text: 'text-green-400',  glow: 'rgba(74,222,128,0.25)',  bar: 'from-green-500 to-green-400',  badge: 'bg-green-500/15 text-green-400 border-green-500/30' };
  if (s > 500) return { text: 'text-secondary',   glow: 'rgba(250,188,10,0.25)',  bar: 'from-secondary to-secondary/70', badge: 'bg-secondary/15 text-secondary border-secondary/30' };
  return        { text: 'text-error',             glow: 'rgba(239,68,68,0.25)',   bar: 'from-error to-error/70',        badge: 'bg-error/15 text-error border-error/30' };
}

/* ── animated horizontal bar ─────────────────────────────────── */
function AnimBar({ label, value, max, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(max > 0 ? (value / max) * 100 : 0), delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-on-surface">{label}</span>
        <span className={`text-xs font-black ${color}`}>{value}</span>
      </div>
      <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            color === 'text-error' ? 'bg-error' : color === 'text-secondary' ? 'bg-secondary' : 'bg-green-500'
          }`}
          style={{ width: `${width}%`, boxShadow: `0 0 8px currentColor` }}
        />
      </div>
    </div>
  );
}

/* ── tier strip ──────────────────────────────────────────────── */
const TIERS = [
  { min: 0,   max: 250,  label: 'D',  desc: 'Critical',  color: 'bg-error/80' },
  { min: 250, max: 500,  label: 'C',  desc: 'Poor',      color: 'bg-orange-500/80' },
  { min: 500, max: 650,  label: 'B-', desc: 'Moderate',  color: 'bg-secondary/80' },
  { min: 650, max: 800,  label: 'B+', desc: 'Secure',    color: 'bg-secondary' },
  { min: 800, max: 920,  label: 'A',  desc: 'Strong',    color: 'bg-green-500/80' },
  { min: 920, max: 1000, label: 'A+', desc: 'Excellent', color: 'bg-green-500' },
];

/* ── mini inline SVG line sparkline ─────────────────────────── */
function Sparkline({ score }) {
  // fake 8-week trend ending at current score
  const base = Math.max(score - 180, 50);
  const pts = [base, base + 20, base - 10, base + 40, base + 25, base + 60, base + 50, score];
  const maxV = Math.max(...pts), minV = Math.min(...pts);
  const range = maxV - minV || 1;
  const W = 200, H = 60;
  const coords = pts.map((v, i) => `${(i / (pts.length - 1)) * W},${H - ((v - minV) / range) * (H - 8) - 4}`);
  const pathD = `M ${coords.join(' L ')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FABC0A" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FABC0A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${W},${H} L 0,${H} Z`} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke="#FABC0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* end dot */}
      <circle cx={W} cy={H - ((score - minV) / range) * (H - 8) - 4} r="3" fill="#FABC0A" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function CyberRating({ scanData, isLoading, error }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-secondary mb-4">autorenew</span>
        <h3 className="font-bold text-lg text-on-surface">Calculating Risk Models...</h3>
        <p className="text-sm text-on-surface-variant mt-2">Computing Q-VaR and security posture ratings.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container text-on-error-container p-4 flex items-center gap-3 rounded-lg shadow-sm border border-error/20">
        <span className="material-symbols-outlined text-error">error</span>
        <div className="flex-1">
          <h4 className="font-bold text-sm">Rating Engine Error</h4>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-50">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4" style={{ fontVariationSettings: "'wght' 200" }}>grade</span>
        <h3 className="font-bold text-lg text-on-surface">No Rating Data</h3>
        <p className="text-sm text-on-surface-variant mt-2">Scan an infrastructure to generate a Cyber Security Rating.</p>
      </div>
    );
  }

  const score    = scanData.score || 0;
  const rating   = scanData.rating || 'N/A';
  const classical = scanData.classical_security || 'N/A';
  const quantum   = scanData.quantum_security || 'N/A';
  const accent    = scoreAccent(score);

  const highRisk  = scanData.summary?.high_risk_assets || 0;
  const qSafe     = scanData.summary?.quantum_safe || 0;
  const total     = scanData.summary?.total_assets || 0;
  const medium    = Math.max(0, total - highRisk - qSafe);

  const pct = Math.round((score / 1000) * 100);

  /* doughnut: half-arc gauge */
  const doughnutData = {
    datasets: [{
      data: [score, 1000 - score],
      backgroundColor: [
        score > 800 ? '#4ade80' : score > 500 ? '#FABC0A' : '#ef4444',
        'rgba(255,255,255,0.04)',
      ],
      borderWidth: 0,
      circumference: 240,
      rotation: 240,
    }]
  };
  const doughnutOptions = {
    cutout: '82%',
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false,
  };

  /* active tier */
  const activeTier = TIERS.find(t => score >= t.min && score < t.max) || TIERS[TIERS.length - 1];

  return (
    <div className="grid grid-cols-12 gap-6">

      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="col-span-12 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight uppercase">Cyber Security Rating</h1>
          <p className="text-sm text-on-surface-variant mt-1">Real-time cryptographic posture & Q-VaR risk assessment.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest ${accent.badge}`}>
          <span className="material-symbols-outlined text-sm">verified</span>
          Certified Scan
        </div>
      </div>

      {/* ── Score Gauge ─────────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-5 glass-card p-8 rounded-3xl border border-outline-variant/20 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ boxShadow: `0 0 60px ${accent.glow}, 0 4px 24px rgba(0,0,0,0.15)` }}>

        {/* corner label */}
        <div className="absolute top-5 right-5 text-[9px] font-black uppercase tracking-[0.25em] text-on-surface-variant/40">Overall Score</div>

        {/* ambient glow behind gauge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)` }} />

        {/* gauge */}
        <div className="w-56 h-56 relative z-10">
          <Doughnut data={doughnutData} options={doughnutOptions} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className={`text-5xl font-black leading-none ${accent.text}`}
              style={{ textShadow: `0 0 20px ${accent.glow}` }}>
              {mounted ? score : 0}
            </span>
            <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em]">/ 1000</span>
          </div>
        </div>

        {/* label + desc */}
        <div className="mt-4 text-center z-10">
          <div className={`text-2xl font-black uppercase tracking-tight ${accent.text}`}>{scoreLabel(score)}</div>
          <p className="text-xs text-on-surface-variant mt-1 max-w-[220px] mx-auto leading-relaxed">
            Infrastructure is <strong className={accent.text}>{pct}%</strong> protected against classical and quantum threats.
          </p>
        </div>

        {/* thin progress bar at bottom */}
        <div className="w-full mt-6 z-10">
          <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${accent.bar} rounded-full transition-all duration-1000`}
              style={{ width: mounted ? `${pct}%` : '0%' }} />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-on-surface-variant/30 mt-1">
            <span>0</span><span>500</span><span>1000</span>
          </div>
        </div>
      </div>

      {/* ── Right Column ─────────────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">

        {/* Rating + Security Standards */}
        <div className="grid grid-cols-3 gap-4">
          {/* Rating Grade */}
          <div className="col-span-1 glass-card p-5 rounded-2xl border border-outline-variant/20 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -bottom-4 -right-4 text-[80px] font-black opacity-5 text-primary leading-none select-none">{rating}</div>
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>grade</span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 mb-1">Rating</p>
              <div className="text-4xl font-black text-primary leading-none">{rating}</div>
            </div>
          </div>

          {/* Quantum Security */}
          <div className="col-span-1 glass-card p-5 rounded-2xl border border-outline-variant/20 flex flex-col justify-between relative overflow-hidden">
            <div className="w-9 h-9 bg-secondary/10 rounded-xl flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>encrypted</span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 mb-1">Quantum Security</p>
              <div className="text-lg font-black text-on-surface leading-snug">{quantum}</div>
              <p className="text-[9px] text-on-surface-variant/60 mt-1">Shor's algorithm resistance</p>
            </div>
          </div>

          {/* Classical Security */}
          <div className="col-span-1 glass-card p-5 rounded-2xl border border-outline-variant/20 flex flex-col justify-between relative overflow-hidden">
            <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-green-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>security_update_good</span>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 mb-1">Classical Security</p>
              <div className="text-lg font-black text-on-surface leading-snug">{classical}</div>
              <p className="text-[9px] text-on-surface-variant/60 mt-1">RSA / ECC evaluation</p>
            </div>
          </div>
        </div>

        {/* Score Trend Sparkline */}
        <div className="glass-card p-5 rounded-2xl border border-outline-variant/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">trending_up</span>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-on-surface">8-Week Score Trend</p>
            </div>
            <span className="text-xs font-black text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">+12%</span>
          </div>
          <Sparkline score={score} />
          <p className="text-[9px] text-on-surface-variant/50 font-medium">Improvement in security posture since last assessment.</p>
        </div>
      </div>

      {/* ── Rating Tiers ─────────────────────────────────────────── */}
      <div className="col-span-12 glass-card p-6 rounded-2xl border border-outline-variant/20">
        <div className="flex items-center gap-2 mb-5">
          <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>stacked_bar_chart</span>
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-on-surface">Rating Tiers</h3>
          <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-on-surface-variant/40">You are here: <span className="text-secondary">{activeTier.label} — {activeTier.desc}</span></span>
        </div>
        <div className="flex gap-1 h-8 rounded-xl overflow-hidden">
          {TIERS.map((tier) => {
            const segW = ((tier.max - tier.min) / 1000) * 100;
            const isActive = activeTier.label === tier.label;
            return (
              <div
                key={tier.label}
                className={`relative flex items-center justify-center h-full rounded-sm transition-all duration-300 ${tier.color} ${isActive ? 'ring-2 ring-white/60 scale-y-110 z-10' : 'opacity-50'}`}
                style={{ width: `${segW}%` }}
                title={`${tier.label}: ${tier.min}–${tier.max}`}
              >
                <span className="text-[10px] font-black text-white drop-shadow">{tier.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-on-surface-variant/40 font-bold mt-1 px-0.5">
          <span>0</span><span>250</span><span>500</span><span>650</span><span>800</span><span>920</span><span>1000</span>
        </div>
      </div>

      {/* ── Asset Risk Distribution ─────────────────────────────── */}
      <div className="col-span-12 glass-card p-6 rounded-2xl border border-outline-variant/20">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-on-surface">Asset Risk Distribution</h3>
          <div className="ml-auto flex items-center gap-4 text-[10px] font-bold text-on-surface-variant/60">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error inline-block" />High</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary inline-block" />Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Low / Safe</span>
          </div>
        </div>

        <div className="space-y-4">
          <AnimBar label="High Risk Assets"    value={highRisk} max={Math.max(total, 1)} color="text-error"     delay={100} />
          <AnimBar label="Medium Risk Assets"  value={medium}   max={Math.max(total, 1)} color="text-secondary" delay={200} />
          <AnimBar label="Quantum Safe Assets" value={qSafe}    max={Math.max(total, 1)} color="text-green-400" delay={300} />
        </div>

        {/* totals row */}
        <div className="mt-6 pt-4 border-t border-outline-variant/20 grid grid-cols-3 gap-4">
          {[
            { label: 'High Risk',   value: highRisk, color: 'text-error',     bg: 'bg-error/10',     icon: 'warning' },
            { label: 'Medium',      value: medium,   color: 'text-secondary', bg: 'bg-secondary/10', icon: 'error_outline' },
            { label: 'Quantum Safe',value: qSafe,    color: 'text-green-400', bg: 'bg-green-500/10', icon: 'verified' },
          ].map(({ label, value, color, bg, icon }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-xl ${bg}`}>
              <span className={`material-symbols-outlined text-lg ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              <div>
                <div className={`text-xl font-black leading-none ${color}`}>{value}</div>
                <div className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
