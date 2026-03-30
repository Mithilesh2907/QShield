import OnDemandReporting from '../components/OnDemandReporting';
import ScheduleReporting from '../components/ScheduleReporting';

export default function Reports({ scanData, isLoading, error }) {
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

  const { summary, insights, cbom, inventory, counts } = scanData;
  const activeAssets = summary?.total_assets || 0;
  const httpOnlyCount = summary?.http_only || 0;
  const pqcRiskLevel = scanData?.risk || 'Low';

  return (
    <div className="grid grid-cols-12 gap-8 auto-rows-min">
      <OnDemandReporting scanData={scanData} />

      {/* Schedule Reporting Section */}
      <ScheduleReporting />

      {/* Overview Stats */}
      <section className="col-span-12 lg:col-span-8 glass-card rounded-lg p-8 shadow-2xl shadow-[#1d1b19]/5 flex flex-col justify-between min-h-[280px]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Overview Stats</h3>
            <p className="text-on-surface-variant text-sm mt-1">Real-time engagement and throughput metrics.</p>
          </div>
          <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Live Feed</span>
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Scanned Assets</span>
            <div className="text-4xl font-black text-primary">{counts?.domains || 0}</div>
            <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
              <span className="material-symbols-outlined text-sm">check_circle</span> Discovered
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Quantum Safe</span>
            <div className="text-4xl font-black text-on-surface">{summary?.quantum_safe || 0}</div>
            <div className="flex items-center gap-1 text-xs text-secondary font-bold">
              <span className="material-symbols-outlined text-sm">shield</span> Verified
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">High Risk Assets</span>
            <div className={`text-4xl font-black ${summary?.high_risk_assets > 0 ? 'text-error' : 'text-green-600'}`}>
              {summary?.high_risk_assets || 0}
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold ${summary?.high_risk_assets > 0 ? 'text-error' : 'text-green-600'}`}>
              <span className="material-symbols-outlined text-sm">{summary?.high_risk_assets > 0 ? 'warning' : 'gpp_good'}</span> {summary?.high_risk_assets > 0 ? 'Action Required' : 'All Clear'}
            </div>
          </div>
        </div>
      </section>

      {/* System Health */}
      <section className="col-span-12 lg:col-span-4 glass-card rounded-lg p-8 shadow-2xl shadow-[#1d1b19]/5 min-h-[280px]">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-6">System Health</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shadow-lg ${activeAssets > 0 ? 'bg-green-500 shadow-green-500/30' : 'bg-surface-dim'}`}></span>
              <span className="font-medium text-sm">Main Infrastructure</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant uppercase">{activeAssets > 0 ? 'Good' : 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shadow-lg ${httpOnlyCount > 0 ? 'bg-secondary shadow-secondary/30' : 'bg-green-500 shadow-green-500/30'}`}></span>
              <span className="font-medium text-sm">HTTPS Enforcement</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant uppercase">{httpOnlyCount > 0 ? 'Warning' : 'Good'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shadow-lg ${pqcRiskLevel === 'High' ? 'bg-error shadow-error/30' : pqcRiskLevel === 'Medium' ? 'bg-secondary shadow-secondary/30' : 'bg-green-500 shadow-green-500/30'}`}></span>
              <span className="font-medium text-sm">Encryption Modules (PQC)</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant uppercase">{pqcRiskLevel}</span>
          </div>
          <div className="pt-4 mt-2 border-t border-outline-variant/20">
            <button className="text-xs font-bold text-secondary uppercase hover:underline">Full Diagnostic</button>
          </div>
        </div>
      </section>

      {/* Resource Summary */}
      <section className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-low rounded-lg p-8">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-6">Resource Summary</h3>
        <div className="space-y-3">
          <div className="p-4 bg-surface rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">dns</span>
              <span className="font-bold text-sm">Hosts</span>
            </div>
            <span className="text-sm font-black text-on-surface-variant">{counts?.domains || 0} Active</span>
          </div>
          <div className="p-4 bg-surface rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">api</span>
              <span className="font-bold text-sm">Open Ports</span>
            </div>
            <span className="text-sm font-black text-on-surface-variant">{inventory?.ports?.length || 0} Total</span>
          </div>
          <div className="p-4 bg-surface rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">devices</span>
              <span className="font-bold text-sm">IP Addresses</span>
            </div>
            <span className="text-sm font-black text-on-surface-variant">{counts?.ips || 0} Unique</span>
          </div>
        </div>
      </section>

      {/* Progress Tracking */}
      <section className="col-span-12 md:col-span-6 lg:col-span-4 glass-card rounded-lg p-8 shadow-2xl shadow-[#1d1b19]/5">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-6">Security Rating</h3>
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold">Overall Score</span>
              <span className="text-2xl font-black text-secondary">{scanData?.score || 0}/100</span>
            </div>
            <div className="h-3 w-full bg-secondary-fixed rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-secondary to-secondary-container rounded-full" style={{ width: `${scanData?.score || 0}%` }}></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold">Rating Segment</span>
              <span className="text-2xl font-black text-primary">{scanData?.rating || 'N/A'}</span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-2">
              Classical Sec: {scanData?.classical_security || 'N/A'} | Quantum Sec: {scanData?.quantum_security || 'N/A'}
            </p>
          </div>
        </div>
      </section>

      {/* Recent Alerts (Insights) */}
      <section className="col-span-12 lg:col-span-4 glass-card rounded-lg p-8 shadow-2xl shadow-[#1d1b19]/5 row-span-1 lg:row-span-1">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-6">Key Insights</h3>
        <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
          {insights && insights.length > 0 ? (
            insights.map((insight, idx) => (
              <div key={idx} className="relative pl-6 pb-6 border-l-2 border-outline-variant/30 last:pb-0">
                <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-secondary ring-4 ring-surface"></div>
                <h4 className="text-sm font-bold mt-1">Platform Insight</h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{insight}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant italic">No insights generated for this scan yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
