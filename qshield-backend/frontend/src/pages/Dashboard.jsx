export default function Dashboard({ scanData, isLoading, error }) {
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

  const { score, risk, quantum_status, summary } = scanData;

  return (
    <div className="grid grid-cols-12 gap-8 auto-rows-min">
      <section className="col-span-12 glass-card rounded-lg p-8 shadow-2xl shadow-[#1d1b19]/5">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Dashboard Overview</h3>
            <p className="text-on-surface-variant text-sm mt-1">High-level security and compliance metrics.</p>
          </div>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Executive</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Security Score</span>
            <div className="text-4xl font-black text-primary">{score || 0}</div>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant font-bold mt-2">
              <span className="material-symbols-outlined text-sm">analytics</span> Overall rating
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Risk Level</span>
            <div className={`text-3xl font-black ${
              risk === 'Low' ? 'text-green-600' : 
              risk === 'Medium' ? 'text-secondary' : 
              'text-error'
            }`}>
              {risk || 'Unknown'}
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold mt-2 ${
              risk === 'Low' ? 'text-green-600' : 
              risk === 'Medium' ? 'text-secondary' : 
              'text-error'
            }`}>
              <span className="material-symbols-outlined text-sm">{risk === 'Low' ? 'verified' : 'warning'}</span> Assessment
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Quantum Status</span>
            <div className="text-2xl font-black text-on-surface pt-1 pb-1">{quantum_status || 'Unknown'}</div>
            <div className="flex items-center gap-1 text-xs text-secondary font-bold mt-2">
              <span className="material-symbols-outlined text-sm">memory</span> PQC Check
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Total Assets</span>
            <div className="text-4xl font-black text-on-surface">{summary?.total_assets || 0}</div>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant font-bold mt-2">
              <span className="material-symbols-outlined text-sm">hub</span> Discovered endpoints
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
