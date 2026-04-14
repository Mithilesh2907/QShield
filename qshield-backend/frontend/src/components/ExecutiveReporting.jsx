import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function KpiCard({ icon, label, value, sub, color = 'text-secondary', bg = 'bg-secondary/10' }) {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-3 border border-outline-variant/20 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
        <span className={`material-symbols-outlined ${color} text-xl`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div>
        <div className={`text-3xl font-black ${color} leading-none`}>{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/60 mt-1">{label}</div>
        {sub && <div className="text-xs text-on-surface-variant mt-1 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

function RiskBadge({ level }) {
  const map = {
    High: { color: 'text-error', bg: 'bg-error/10', dot: 'bg-error' },
    Medium: { color: 'text-secondary', bg: 'bg-secondary/10', dot: 'bg-secondary' },
    Low: { color: 'text-green-600', bg: 'bg-green-500/10', dot: 'bg-green-500' },
  };
  const s = map[level] || map.Low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {level} Risk
    </span>
  );
}

export default function ExecutiveReporting({ scanData }) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  if (!scanData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] opacity-50">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4" style={{ fontVariationSettings: "'wght' 200" }}>bar_chart</span>
        <p className="text-sm text-on-surface-variant">No scan data available. Run a scan first.</p>
      </div>
    );
  }

  const { summary, insights, cbom, inventory, counts } = scanData;
  const totalAssets = summary?.total_assets || 0;
  const quantumSafe = summary?.quantum_safe || 0;
  const highRisk = summary?.high_risk_assets || 0;
  const httpOnly = summary?.http_only || 0;
  const score = scanData?.score || 0;
  const rating = scanData?.rating || 'N/A';
  const riskLevel = scanData?.risk || 'Low';
  const classicalSec = scanData?.classical_security || 'N/A';
  const quantumSec = scanData?.quantum_security || 'N/A';

  // CBOM stats
  let cbomList = [];
  if (Array.isArray(scanData.cbom)) cbomList = scanData.cbom;
  else if (scanData.cbom?.components) cbomList = scanData.cbom.components;
  else if (scanData.cbom?.items) cbomList = scanData.cbom.items;
  const qSafe = cbomList.filter(i => i.quantum_safe || i.is_quantum_safe).length;
  const qVuln = cbomList.length - qSafe;
  const pqcPct = cbomList.length > 0 ? Math.round((qSafe / cbomList.length) * 100) : 0;

  const ratingColor = score >= 800 ? 'text-green-600' : score >= 500 ? 'text-secondary' : 'text-error';
  const ratingBarColor = score >= 800 ? 'from-green-500 to-green-400' : score >= 500 ? 'from-secondary to-secondary/70' : 'from-error to-error/70';

  // Threat findings for the summary table
  const threats = [
    { category: 'HTTP-Only Endpoints', count: httpOnly, severity: httpOnly > 3 ? 'High' : httpOnly > 0 ? 'Medium' : 'Low', icon: 'http' },
    { category: 'High Risk Assets', count: highRisk, severity: highRisk > 5 ? 'High' : highRisk > 0 ? 'Medium' : 'Low', icon: 'warning' },
    { category: 'Quantum Vulnerable Ciphers', count: qVuln, severity: qVuln > 5 ? 'High' : qVuln > 0 ? 'Medium' : 'Low', icon: 'lock_open' },
    { category: 'Open Ports Detected', count: inventory?.ports?.length || 0, severity: (inventory?.ports?.length || 0) > 10 ? 'High' : (inventory?.ports?.length || 0) > 0 ? 'Medium' : 'Low', icon: 'router' },
  ];

  const generatePDF = () => {
    setExporting(true);
    setTimeout(() => {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();

      // — Title Page —
      doc.setFillColor(181, 10, 46);
      doc.rect(0, 0, 15, ph, 'F');
      doc.setFillColor(229, 160, 62);
      doc.rect(15, 0, 3, ph, 'F');

      doc.setFontSize(48);
      doc.setTextColor(181, 10, 46);
      doc.setFont('helvetica', 'bold');
      doc.text('REQUIEM', 35, 75);

      doc.setFontSize(14);
      doc.setTextColor(229, 160, 62);
      doc.setFont('helvetica', 'normal');
      doc.text('PUNJAB NATIONAL BANK', 35, 88);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(35, 96, pw - 20, 96);

      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text('Executive Security Briefing & Risk Posture Report', 35, 106);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text('Classification:', pw - 20, ph - 40, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(181, 10, 46);
      doc.text('STRICTLY CONFIDENTIAL', pw - 20, ph - 34, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pw - 20, ph - 25, { align: 'right' });

      // — Page 2: KPIs —
      doc.addPage();
      doc.setFillColor(181, 10, 46);
      doc.rect(0, 0, 15, ph, 'F');
      doc.setFillColor(229, 160, 62);
      doc.rect(15, 0, 3, ph, 'F');

      doc.setFontSize(18);
      doc.setTextColor(181, 10, 46);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 35, 25);
      doc.setDrawColor(229, 160, 62);
      doc.setLineWidth(0.8);
      doc.line(35, 30, pw - 20, 30);

      // KPI boxes
      const kpis = [
        ['TOTAL ASSETS', `${totalAssets}`],
        ['QUANTUM SAFE', `${quantumSafe}`],
        ['HIGH RISK', `${highRisk}`],
        ['CYBER SCORE', `${score}/1000`],
      ];
      kpis.forEach(([lbl, val], i) => {
        const x = 35 + (i % 2) * 85;
        const y = 40 + Math.floor(i / 2) * 35;
        doc.setFillColor(252, 248, 242);
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(x, y, 78, 28, 3, 3, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.text(lbl, x + 4, y + 8);
        doc.setFontSize(18);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text(val, x + 4, y + 22);
      });

      // Cyber Rating bar
      let barY = 118;
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'bold');
      doc.text('Cyber Risk Rating', 35, barY);
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(35, barY + 4, pw - 55, 8, 4, 4, 'F');
      let bc = score >= 800 ? [40, 167, 69] : score >= 500 ? [229, 160, 62] : [220, 53, 69];
      doc.setFillColor(...bc);
      doc.roundedRect(35, barY + 4, Math.max((score / 1000) * (pw - 55), 8), 8, 4, 4, 'F');
      doc.setFontSize(10);
      doc.setTextColor(...bc);
      doc.text(`${score} / 1000 — Rating Segment: ${rating}`, 35, barY + 20);

      // Threat table
      autoTable(doc, {
        startY: barY + 28,
        head: [['Risk Category', 'Count', 'Severity']],
        body: threats.map(t => [t.category, t.count.toString(), t.severity]),
        theme: 'grid',
        headStyles: { fillColor: [229, 160, 62], fontStyle: 'bold' },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 2) {
            if (data.cell.raw === 'High') data.cell.styles.textColor = [220, 53, 69];
            else if (data.cell.raw === 'Medium') data.cell.styles.textColor = [229, 160, 62];
            else data.cell.styles.textColor = [40, 167, 69];
          }
        }
      });

      // Insights
      if (insights && insights.length > 0) {
        let iy = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Insights for Board Review', 35, iy);
        iy += 6;
        insights.slice(0, 5).forEach(ins => {
          doc.setFillColor(229, 160, 62);
          doc.rect(35, iy, 2, 7, 'F');
          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(ins, pw - 55);
          doc.text(lines, 40, iy + 4);
          iy += lines.length * 5 + 5;
          if (iy > ph - 20) { doc.addPage(); iy = 20; }
        });
      }

      // Footer
      const pages = doc.internal.getNumberOfPages();
      for (let i = 2; i <= pages; i++) {
        doc.setPage(i);
        doc.setDrawColor(229, 160, 62);
        doc.setLineWidth(0.5);
        doc.line(20, ph - 13, pw - 20, ph - 13);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.text('REQUIEM | PNB — CONFIDENTIAL', 20, ph - 8);
        doc.text(`Page ${i - 1} of ${pages - 1}`, pw - 20, ph - 8, { align: 'right' });
      }

      doc.save(`REQUIEM_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    }, 1200);
  };

  return (
    <section className="col-span-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>supervisor_account</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-on-surface tracking-tight">Executive Briefing</h2>
            <p className="text-xs text-on-surface-variant font-medium">Board-level risk posture & KPI dashboard</p>
          </div>
        </div>

        <button
          onClick={generatePDF}
          disabled={exporting}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all duration-200 shadow-md ${
            exported
              ? 'bg-green-600 shadow-green-500/20'
              : exporting
              ? 'bg-primary/60 cursor-not-allowed'
              : 'bg-primary hover:brightness-110 active:scale-[0.98] shadow-primary/25'
          }`}
        >
          {exporting ? (
            <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span>
          ) : exported ? (
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          )}
          {exporting ? 'Generating…' : exported ? 'Report Saved!' : 'Export PDF'}
        </button>
      </div>

      {/* Cyber Score Banner */}
      <div className="glass-card rounded-2xl p-6 border border-outline-variant/20 shadow-lg">
        <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-1">Cyber Risk Rating</p>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-black leading-none ${ratingColor}`}>{score}</span>
              <span className="text-lg font-bold text-on-surface-variant/50 mb-1">/1000</span>
              <span className={`ml-2 mb-1 px-3 py-1 rounded-full text-sm font-black ${ratingColor} bg-current/10`}
                style={{ backgroundColor: score >= 800 ? 'rgb(22 163 74 / 0.1)' : score >= 500 ? 'rgb(250 188 10 / 0.12)' : 'rgb(239 68 68 / 0.1)' }}>
                {rating}
              </span>
            </div>
          </div>
          <RiskBadge level={riskLevel} />
        </div>
        <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full bg-gradient-to-r ${ratingBarColor} rounded-full transition-all duration-1000`}
            style={{ width: `${(score / 1000) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/40 mt-1 px-0.5">
          <span>0</span><span>250</span><span>500</span><span>750</span><span>1000</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon="dns" label="Total Assets" value={totalAssets} sub={`${counts?.domains || 0} domains`} color="text-on-surface" bg="bg-surface-container-high" />
        <KpiCard icon="verified_user" label="Quantum Safe" value={quantumSafe}
          sub={`${totalAssets > 0 ? Math.round((quantumSafe / totalAssets) * 100) : 0}% coverage`}
          color="text-secondary" bg="bg-secondary/10" />
        <KpiCard icon="warning" label="High Risk" value={highRisk}
          sub={highRisk > 0 ? 'Immediate action' : 'All clear'}
          color={highRisk > 0 ? 'text-error' : 'text-green-600'}
          bg={highRisk > 0 ? 'bg-error/10' : 'bg-green-500/10'} />
        <KpiCard icon="http" label="Unencrypted" value={httpOnly}
          sub="HTTP-only endpoints"
          color={httpOnly > 0 ? 'text-secondary' : 'text-green-600'}
          bg={httpOnly > 0 ? 'bg-secondary/10' : 'bg-green-500/10'} />
      </div>

      {/* Two-column: Threat Matrix + PQC Posture */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Threat Matrix */}
        <div className="glass-card rounded-2xl p-6 border border-outline-variant/20 shadow-md">
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>crisis_alert</span>
            Threat Matrix
          </h3>
          <div className="space-y-3">
            {threats.map((t) => {
              const sev = t.severity;
              const pct = t.count > 0 ? Math.min((t.count / Math.max(totalAssets, 1)) * 100, 100) : 0;
              const barColor = sev === 'High' ? 'bg-error' : sev === 'Medium' ? 'bg-secondary' : 'bg-green-500';
              const textColor = sev === 'High' ? 'text-error' : sev === 'Medium' ? 'text-secondary' : 'text-green-600';
              return (
                <div key={t.category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${textColor}`}>{t.icon}</span>
                      <span className="text-xs font-bold text-on-surface">{t.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-on-surface">{t.count}</span>
                      <RiskBadge level={sev} />
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PQC & Encryption Posture */}
        <div className="glass-card rounded-2xl p-6 border border-outline-variant/20 shadow-md">
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
            PQC Posture
          </h3>
          <div className="space-y-4">
            {/* Readiness ring */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-container-high" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5"
                    stroke={pqcPct >= 80 ? '#22c55e' : pqcPct >= 50 ? '#FABC0A' : '#ef4444'}
                    strokeDasharray={`${pqcPct} ${100 - pqcPct}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-sm font-black ${pqcPct >= 80 ? 'text-green-600' : pqcPct >= 50 ? 'text-secondary' : 'text-error'}`}>{pqcPct}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-on-surface">Quantum Readiness</p>
                <p className="text-xs text-on-surface-variant">{qSafe} of {cbomList.length} ciphers quantum-safe</p>
                <p className="text-xs text-on-surface-variant">{qVuln} cipher{qVuln !== 1 ? 's' : ''} need migration</p>
              </div>
            </div>
            <div className="pt-3 border-t border-outline-variant/20 space-y-2">
              {[
                { label: 'Classical Security', value: classicalSec, icon: 'lock' },
                { label: 'Quantum Security', value: quantumSec, icon: 'encrypted' },
                { label: 'Open Ports', value: `${inventory?.ports?.length || 0} detected`, icon: 'router' },
                { label: 'Unique IPs', value: `${counts?.ips || 0}`, icon: 'devices' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant/50">{icon}</span>
                    {label}
                  </div>
                  <span className="text-xs font-black text-on-surface">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      {insights && insights.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-outline-variant/20 shadow-md">
          <h3 className="text-sm font-black uppercase tracking-[0.15em] text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
            Board-Level Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.slice(0, 6).map((ins, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/15">
                <span className="shrink-0 w-5 h-5 rounded-full bg-secondary/15 flex items-center justify-center">
                  <span className="text-secondary text-[10px] font-black">{i + 1}</span>
                </span>
                <p className="text-xs text-on-surface-variant leading-relaxed">{ins}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
