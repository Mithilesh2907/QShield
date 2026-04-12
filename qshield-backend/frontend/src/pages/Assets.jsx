import React, { useState, useMemo } from 'react';

const getExpiryDaysFromAsset = (asset) => {
  const days = asset?.certificate?.expiry_days;
  if (typeof days === 'number') {
    return days;
  }
  const expiryDate = asset?.certificate?.expiry_date;
  if (expiryDate) {
    const parsed = Date.parse(expiryDate);
    if (!Number.isNaN(parsed)) {
      return Math.floor((parsed - Date.now()) / (1000 * 60 * 60 * 24));
    }
  }
  return null;
};

const getMappedType = (type) => {
  const t = (type || '').toLowerCase();
  if (t === 'web') return 'Web Application';
  if (t === 'api') return 'Api';
  if (t === 'server') return 'Web Server';
  if (t === 'domain') return 'Domain';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
};

const getTypeColorClass = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('web application')) return 'bg-blue-100 text-blue-800';
  if (t.includes('web server')) return 'bg-cyan-100 text-cyan-800';
  if (t.includes('api')) return 'bg-purple-100 text-purple-800';
  if (t.includes('domain')) return 'bg-green-100 text-green-800';
  if (t.includes('ssl')) return 'bg-teal-100 text-teal-800';
  if (t.includes('cdn')) return 'bg-pink-100 text-pink-800';
  if (t.includes('mail')) return 'bg-orange-100 text-orange-800';
  return 'bg-gray-200 text-gray-700';
};

const getExpiryTone = (status) => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('expired')) return 'text-red-700 bg-red-50';
  if (normalized.includes('expiring')) return 'text-amber-700 bg-amber-50';
  if (normalized.includes('valid')) return 'text-green-700 bg-green-50';
  return 'text-gray-600 bg-gray-100';
};

const getCertRiskTone = (risk) => {
  const normalized = (risk || '').toLowerCase();
  if (normalized === 'high') return 'text-red-700 bg-red-50';
  if (normalized === 'medium') return 'text-amber-700 bg-amber-50';
  if (normalized === 'low') return 'text-green-700 bg-green-50';
  return 'text-gray-600 bg-gray-100';
};

export default function Assets({ scanData, isLoading, error }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');

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

  const crtshAssetsByDomain = useMemo(() => {
    const map = new Map();
    (scanData.assets || []).forEach((asset) => {
      const domain = (asset?.domain || '').toLowerCase();
      if (domain) {
        map.set(domain, asset);
      }
    });
    return map;
  }, [scanData.assets]);

  const sourceAssets = Array.isArray(scanData.cbom) && scanData.cbom.length ? scanData.cbom : scanData.assets || [];
  const assets = sourceAssets.map((asset) => {
    const enrichment = crtshAssetsByDomain.get((asset?.domain || '').toLowerCase()) || {};
    return {
      ...asset,
      issuer: asset?.issuer ?? enrichment?.issuer,
      expiry_date: asset?.expiry_date ?? enrichment?.expiry_date,
      days_remaining: asset?.days_remaining ?? enrichment?.days_remaining,
      cert_count: asset?.cert_count ?? enrichment?.cert_count,
      san_count: asset?.san_count ?? enrichment?.san_count,
      expiry_status: asset?.expiry_status ?? enrichment?.expiry_status,
      cert_risk: asset?.cert_risk ?? enrichment?.cert_risk,
      cert_valid_from: asset?.cert_valid_from ?? enrichment?.cert_valid_from,
      cert_valid_to: asset?.cert_valid_to ?? enrichment?.cert_valid_to,
      type: getMappedType(asset?.type || 'Unknown'),
      services: asset?.services || [],
    };
  });

  const typeGroups = useMemo(() => {
    const groups = {};
    assets.forEach(a => {
      groups[a.type] = (groups[a.type] || 0) + 1;
    });
    return groups;
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      let matchSearch = true;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        matchSearch = (asset.domain || '').toLowerCase().includes(q) || 
                      (asset.ip || '').toLowerCase().includes(q) ||
                      (asset.type || '').toLowerCase().includes(q);
      }
      
      let matchType = true;
      if (typeFilter !== 'All') {
        matchType = asset.type === typeFilter;
      }

      let matchRisk = true;
      if (riskFilter !== 'All') {
        const risk = (asset.risk_level || 'Unknown').toLowerCase();
        matchRisk = risk === riskFilter.toLowerCase();
      }

      return matchSearch && matchType && matchRisk;
    });
  }, [assets, searchQuery, typeFilter, riskFilter]);

  const numApis = assets.filter(a => a.type === 'Api').length;

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header section matching the image */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[28px] font-bold text-[#721c24] mb-1 tracking-tight">Asset Inventory</h2>
          <p className="text-[15px] font-medium text-gray-600">
            {assets.length} unique assets · {numApis} APIs · 0 CDN-protected · 0 WAF-protected
          </p>
        </div>
      </div>

      {/* Categorization Pills */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => setTypeFilter('All')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors shadow-sm border border-transparent ${typeFilter === 'All' ? 'bg-[#721c24] text-white' : 'bg-[#e9ecef] text-gray-600 hover:bg-gray-300'} `}
        >
          All Assets <span className="ml-1 opacity-70 font-medium">{assets.length}</span>
        </button>
        {Object.entries(typeGroups).map(([type, count]) => {
          let pillClass = getTypeColorClass(type);
          if (typeFilter === type) {
            pillClass += " ring-2 ring-offset-2 ring-[#721c24]";
          } else {
            pillClass += " hover:brightness-95";
          }
          return (
            <button 
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all shadow-sm ${pillClass} `}
            >
              {type} <span className="ml-1 font-medium">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Risk Filters */}
      <div className="bg-[#fcf8f0] p-4 rounded-xl flex items-center justify-between shadow-sm border border-[#e5dfd3]">
        <div className="flex items-center gap-8 w-full max-w-4xl">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search assets, types..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#dee2e6] rounded-lg text-[15px] font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#721c24]/20 focus:border-[#721c24]"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-[15px] font-medium text-gray-500">Risk:</span>
            <div className="flex flex-wrap gap-1 border border-[#dee2e6] rounded-md p-1 bg-white">
              {['All', 'Critical', 'High', 'Medium', 'Low', 'Unknown'].map(risk => {
                let riskColor = riskFilter === risk ? 'bg-[#721c24] text-white border-transparent' : 'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent';
                if (riskFilter !== risk) {
                  if (risk === 'Critical') riskColor += ' hover:text-red-700';
                  if (risk === 'High') riskColor += ' hover:text-orange-600';
                  if (risk === 'Medium') riskColor += ' hover:text-amber-600';
                  if (risk === 'Low') riskColor += ' hover:text-green-600';
                }
                
                return (
                  <button
                    key={risk}
                    onClick={() => setRiskFilter(risk)}
                    className={`px-4 py-1.5 rounded text-[13px] font-bold border transition-colors ${riskColor}`}
                  >
                    {risk}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="text-[14px] font-medium text-gray-500 pl-4">
          {filteredAssets.length} of {assets.length} assets
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-[#fdfbf6] rounded-xl overflow-hidden border border-[#e5dfd3] shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e5dfd3]">
                <th className="p-4 w-4 bg-transparent"></th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Asset</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Asset Type</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">IP / Subnet</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Cipher Str.</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">TLS</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Key</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Issuer CA</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Expiry</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">SANs</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Cert History</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Cert Risk</th>
                <th className="p-4 text-[11px] font-bold tracking-[0.1em] text-[#721c24] uppercase whitespace-nowrap bg-transparent">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5dfd3]">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((asset, i) => {
                  let cipherColor = 'text-gray-500 bg-gray-100';
                  if (asset.tls_label === 'Secure') cipherColor = 'text-green-700 bg-green-50';
                  else if (asset.tls_label === 'Moderate') cipherColor = 'text-[#b07d12] bg-[#fbf5e6]';
                  else if (asset.tls_label === 'Weak') cipherColor = 'text-red-700 bg-red-50';
                  
                  const typeClass = getTypeColorClass(asset.type);
                  const isApi = (asset.type || '').toLowerCase() === 'api';
                  
                  return (
                    <tr key={i} className="hover:bg-black/[0.02] transition-colors">
                      <td className="p-4 w-4"></td>
                      <td className="p-4 text-[14px] font-bold text-[#1a56db] whitespace-nowrap">{asset.domain || '--'}</td>
                      <td className="p-4 text-[14px]">
                        <span className={`px-2.5 py-1 rounded-full text-[12px] font-bold ${typeClass} whitespace-nowrap`}>
                          {asset.type}
                        </span>
                      </td>
                      <td className="p-4 text-[14px] font-medium text-gray-700 whitespace-nowrap">
                        {asset.ip ? (
                          <div className="flex flex-col leading-tight">
                            <span>{asset.ip}</span>
                            <span className="text-gray-400 text-[11px] italic mt-0.5">{asset.ip}/24</span>
                          </div>
                        ) : <span className="text-gray-400">--</span>}
                      </td>
                      <td className="p-4 text-[14px] font-bold whitespace-nowrap">
                        {asset.tls_label ? (
                          <span className={`px-2 py-0.5 rounded text-[12px] ${cipherColor}`}>{asset.tls_label}</span>
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className={`p-4 text-[14px] font-bold whitespace-nowrap ${['Not Supported', 'Unknown', null, undefined].includes(asset.tls_version) ? 'text-red-500' : 'text-green-600'}`}>
                        {asset.tls_version && asset.tls_version !== 'Unknown' ? asset.tls_version : 'Not Supported'}
                      </td>
                      <td className="p-4 text-[14px] font-bold text-[#1a56db] whitespace-nowrap">{asset.key_size ? `${asset.key_size}-bit` : <span className="text-gray-300">--</span>}</td>
                      <td className="p-4 text-[13px] font-medium text-gray-600 truncate max-w-[150px]" title={asset.certificate?.issuer_ca || ''}>
                        {asset.certificate?.issuer_ca || <span className="text-gray-300">--</span>}
                      </td>
                      <td
                        className="p-4 text-[13px] font-medium text-gray-700 whitespace-nowrap"
                        title={asset.issuer ? `Issuer: ${asset.issuer}\nValid from: ${asset.cert_valid_from || '--'}\nValid to: ${asset.cert_valid_to || '--'}` : ''}
                      >
                        {asset.expiry_status ? (
                          <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${getExpiryTone(asset.expiry_status)}`}>
                            {asset.expiry_status}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                        {asset.expiry_date ? (
                          <div className="text-[11px] text-gray-500 mt-1">{asset.expiry_date}</div>
                        ) : null}
                      </td>
                      <td className="p-4 text-[14px] font-bold text-gray-700 whitespace-nowrap">
                        {typeof asset.san_count === 'number' ? asset.san_count : <span className="text-gray-300">--</span>}
                      </td>
                      <td className="p-4 text-[14px] font-bold text-gray-700 whitespace-nowrap">
                        {typeof asset.cert_count === 'number' ? asset.cert_count : <span className="text-gray-300">--</span>}
                      </td>
                      <td className="p-4 text-[14px] whitespace-nowrap">
                        {asset.cert_risk ? (
                          <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${getCertRiskTone(asset.cert_risk)}`}>
                            {asset.cert_risk}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                      <td className="p-4 text-[14px] whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-bold rounded-full ${
                          asset.risk_level === 'Low' ? 'bg-green-100 text-green-800' : 
                          asset.risk_level === 'Medium' || asset.risk_level === 'Moderate' ? 'bg-secondary-container text-on-secondary-container bg-[#fbf5e6] text-[#b07d12]' :
                          asset.risk_level === 'High' || asset.risk_level === 'Critical' ? 'bg-error-container text-on-error-container bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {asset.risk_level || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="13" className="p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">search_off</span>
                    <p className="text-gray-500 font-medium">No assets matching your filters</p>
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
