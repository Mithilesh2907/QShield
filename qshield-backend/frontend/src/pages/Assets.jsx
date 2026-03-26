export default function Assets({ scanData, isLoading, error }) {
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

  const { assets, counts } = scanData;

  return (
    <div className="grid grid-cols-12 gap-8 auto-rows-min">
      <section className="col-span-12 glass-card rounded-lg p-8 shadow-2xl shadow-[#1d1b19]/5">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Asset Discovery</h3>
            <p className="text-on-surface-variant text-sm mt-1">Found {counts?.domains || 0} domains and {counts?.ips || 0} unique IPs.</p>
          </div>
          <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Inventory</span>
        </div>
        
        <div className="overflow-hidden rounded-xl border border-outline-variant/30 mt-4">
          <table className="min-w-full divide-y divide-outline-variant/30">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Domain</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 bg-surface">
              {assets && assets.length > 0 ? (
                assets.map((asset, i) => (
                  <tr key={i} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-on-surface">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-secondary">language</span>
                        {asset.domain}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant/50">router</span>
                        {asset.ip || 'Unknown'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="px-6 py-8 text-center text-sm font-medium text-on-surface-variant">No assets found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
