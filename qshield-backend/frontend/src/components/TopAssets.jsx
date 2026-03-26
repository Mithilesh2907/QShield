const riskOrder = { High: 0, Medium: 1, Low: 2 };

const certStatusBadges = {
  Expired: 'text-red-800 bg-red-100',
  'Expiring Soon': 'text-orange-900 bg-orange-100',
  Valid: 'text-emerald-800 bg-emerald-100'
};

const riskBadges = {
  High: 'text-red-800 bg-red-100',
  Medium: 'text-amber-900 bg-amber-100',
  Low: 'text-emerald-800 bg-emerald-100'
};

const getExpiryDays = (item) => {
  const days = item?.certificate?.expiry_days;
  if (typeof days === 'number') {
    return days;
  }
  const date = item?.certificate?.expiry_date;
  if (date) {
    const delta = Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return Number.isNaN(delta) ? null : delta;
  }
  return null;
};

const certStatusIcon = (status) => {
  if (status === 'Expired') return '⚠';
  if (status === 'Expiring Soon') return '⏳';
  return '✔';
};

const formatExpiryLabel = (item) => {
  const date = item?.certificate?.expiry_date;
  if (!date) return 'Unknown';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString();
};

export default function TopAssets({ data }) {
  if (!data?.cbom) return null;

  const assets = [...data.cbom];
  assets.sort((a, b) => {
    const riskA = riskOrder[a.risk_level] ?? 3;
    const riskB = riskOrder[b.risk_level] ?? 3;
    if (riskA !== riskB) return riskA - riskB;
    const daysA = getExpiryDays(a);
    const daysB = getExpiryDays(b);
    if (daysA !== daysB) {
      if (daysA === null) return 1;
      if (daysB === null) return -1;
      return daysA - daysB;
    }
    return 0;
  });

  const topAssets = assets.slice(0, 5);

  const renderCertStatus = (item) => {
    const days = getExpiryDays(item);
    let label = 'Valid';
    if (typeof days === 'number') {
      if (days <= 0) {
        label = 'Expired';
      } else if (days <= 30) {
        label = 'Expiring Soon';
      }
    }
    const className = certStatusBadges[label] || certStatusBadges.Valid;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {certStatusIcon(label)} {label}
      </span>
    );
  };

  return (
    <section className="col-span-12 mt-6 bg-gray-900 rounded-2xl border border-white/10 shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white text-lg font-semibold">Top 5 Assets Summary</h3>
          <p className="text-xs text-on-surface-variant">Prioritized by risk and certificate health</p>
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-secondary">Live</span>
      </div>
      {topAssets.length ? (
        <div className="overflow-hidden rounded-xl border border-outline-variant/30">
          <table className="min-w-full text-sm divide-y divide-outline-variant/30">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Domain</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Risk</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Certificate</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Expiry</th>
              </tr>
            </thead>
            <tbody className="bg-surface">
              {topAssets.map((asset) => {
                const expiryLabel = formatExpiryLabel(asset);
                const riskBadge = riskBadges[asset.risk_level] || riskBadges.Low;
                return (
                  <tr key={asset.domain} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-on-surface font-semibold">{asset.domain}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskBadge}`}>
                        {asset.risk_level || 'Low'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{renderCertStatus(asset)}</td>
                    <td className="px-4 py-3 text-right text-xs text-on-surface-variant">{expiryLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">No assets available.</p>
      )}
    </section>
  );
}
