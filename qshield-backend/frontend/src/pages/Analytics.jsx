export default function Analytics({ scanData, isLoading, error }) {
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

  const { insights, counts, summary } = scanData;

  return (
    <div className="grid grid-cols-12 gap-8 auto-rows-min">
      <section className="col-span-12 glass-card rounded-lg p-8 shadow-2xl shadow-[#1d1b19]/5">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Scan Analytics</h3>
            <p className="text-on-surface-variant text-sm mt-1">Aggregated insights and adoption metrics.</p>
          </div>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Metrics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
           <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 flex items-center justify-between shadow-sm">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60 mb-2">HTTPS Adoption</h3>
              <p className="text-3xl font-black text-green-600">{summary?.https_enabled || 0} / {summary?.total_assets || 0}</p>
            </div>
            <span className="material-symbols-outlined text-4xl text-green-600/20">lock</span>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 flex items-center justify-between shadow-sm">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60 mb-2">Quantum Vulnerable</h3>
              <p className="text-3xl font-black text-error">{summary?.quantum_vulnerable || 0}</p>
            </div>
            <span className="material-symbols-outlined text-4xl text-error/20">warning</span>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 flex items-center justify-between shadow-sm">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60 mb-2">Unique IPs</h3>
              <p className="text-3xl font-black text-secondary">{counts?.ips || 0}</p>
            </div>
            <span className="material-symbols-outlined text-4xl text-secondary/20">router</span>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-6 shadow-sm mt-4">
          <h2 className="text-lg font-bold mb-6 text-on-surface flex items-center">
            <span className="material-symbols-outlined mr-2 text-primary">lightbulb</span>
            Actionable Insights
          </h2>
          <div className="space-y-4">
            {insights && insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div key={idx} className="relative pl-6 pb-6 border-l-2 border-outline-variant/30 last:pb-0">
                  <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-primary ring-4 ring-surface"></div>
                  <h4 className="text-sm font-bold mt-1 text-on-surface">Platform Insight</h4>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{insight}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-on-surface-variant font-medium italic p-4">Empty insight list.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
