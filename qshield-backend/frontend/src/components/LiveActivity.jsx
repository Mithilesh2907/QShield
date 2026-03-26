const timelineItems = [
  { label: 'Scan initiated', icon: '⚡', status: 'Operational' },
  { label: 'Assets discovered', icon: '✔', status: 'Tracking' },
  { label: 'HTTPS enabled', icon: '✔', status: 'Protected' },
  { label: 'Quantum vulnerabilities detected', icon: '⚠', status: 'PQC' },
  { label: 'Report generated successfully', icon: '✔', status: 'Ready' }
];

export default function LiveActivity({ summary }) {
  if (!summary) return null;

  const items = timelineItems.map((item) => {
    let value = item.label === 'Assets discovered' ? summary.total_assets || 0 : null;
    if (item.label === 'HTTPS enabled') {
      value = summary.https_enabled || 0;
    }
    if (item.label === 'Quantum vulnerabilities detected') {
      value = summary.quantum_vulnerable || 0;
    }

    return (
      <div key={item.label} className="flex gap-3 items-start">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-base">
          {item.icon}
        </div>
        <div className="flex-1">
          <p className="text-on-surface font-semibold">{item.label}</p>
          <p className="text-xs text-on-surface-variant">
            {value !== null ? `${value} • ${item.status}` : item.status}
          </p>
        </div>
      </div>
    );
  });

  return (
    <section className="col-span-12 md:col-span-6 bg-surface/70 backdrop-blur rounded-3xl p-6 shadow-lg border border-outline-variant/20 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-lg text-on-surface">Live Activity</h4>
          <p className="text-xs text-on-surface-variant">Streaming telemetry from the latest scan run</p>
        </div>
        <span className="text-xs font-bold text-secondary uppercase tracking-[0.3em]">Realtime</span>
      </div>
      <div className="space-y-4">{items}</div>
    </section>
  );
}
