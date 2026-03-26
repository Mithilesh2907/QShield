export default function Security({ scanData, isLoading, error }) {
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

  const { cbom } = scanData;

  return (
    <div className="grid grid-cols-12 gap-8 auto-rows-min">
      <section className="col-span-12 glass-card rounded-lg p-8 shadow-2xl shadow-[#1d1b19]/5">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Cryptographic Bill of Materials (CBOM)</h3>
            <p className="text-on-surface-variant text-sm mt-1">Detailed view of cryptographic algorithms, ciphers, and protocols across your assets.</p>
          </div>
          <span className="bg-error/10 text-error px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Security</span>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-outline-variant/30 mt-4">
          <table className="min-w-full divide-y divide-outline-variant/30">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Domain</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">TLS Version</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Cipher Suite</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Algorithm Detail</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 bg-surface">
              {cbom && cbom.length > 0 ? (
                cbom.map((item, i) => (
                  <tr key={i} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-on-surface">{item.domain}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-surface-container-high rounded text-xs font-bold border border-outline-variant/30 text-on-surface">{item.tls_version}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{item.cipher}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                      {item.algorithm_type ? `${item.algorithm_type} (${item.key_strength || 'Unknown'})` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-bold rounded-full ${
                        item.risk_level === 'Low' ? 'bg-green-100 text-green-800' : 
                        item.risk_level === 'Medium' ? 'bg-secondary-container text-on-secondary-container' :
                        'bg-error-container text-on-error-container'
                      }`}>
                        {item.risk_level}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm font-medium text-on-surface-variant">No CBOM data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
