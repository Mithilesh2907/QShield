import { useEffect, useMemo, useRef, useState } from 'react';

const ACTIONS = [
  { key: 'summary', label: 'Summary' },
  { key: 'highRisk', label: 'High Risk Assets' },
  { key: 'certs', label: 'Certificate Issues' },
  { key: 'vulns', label: 'Vulnerabilities' },
  { key: 'recs', label: 'Recommendations' },
  { key: 'breakdown', label: 'Asset Breakdown' }
];

function formatDomainList(items) {
  if (items.length === 0) {
    return 'None found.';
  }
  return items.join(', ');
}

function isExpiringSoon(dateStr) {
  if (!dateStr) {
    return true;
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }
  const now = new Date();
  const diffDays = (parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

export default function Assistant({ scanData }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  const summary = scanData?.summary || {};
  const assets = scanData?.assets || [];
  const vulnerabilities = scanData?.vulnerabilities || [];

  const assetBreakdown = useMemo(() => {
    const totalDomains = assets.map((asset) => asset.domain).filter(Boolean);
    const uniqueIps = Array.from(new Set(assets.map((asset) => asset.ip).filter(Boolean)));
    const webApps = summary.web_apps ?? totalDomains.length;
    const apis = summary.apis ?? totalDomains.filter((domain) => domain.toLowerCase().includes('api')).length;
    const servers = summary.servers ?? uniqueIps.length;
    return { webApps, apis, servers };
  }, [assets, summary]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAction = (type, label) => {
    const userMessage = { type: 'user', text: `Show me ${label.toLowerCase()}` };
    const botMessage = { type: 'bot', text: buildResponse(type, { summary, assets, vulnerabilities, assetBreakdown }) };
    setMessages((prev) => [...prev, userMessage, botMessage]);
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg shadow-black/30 flex items-center justify-center hover:bg-blue-500 transition-colors"
        aria-label="Open assistant"
      >
        <span className="material-symbols-outlined text-2xl">smart_toy</span>
      </button>

      <section
        className={`fixed bottom-20 right-5 z-50 w-[400px] h-[550px] max-w-[420px] sm:w-[400px] sm:h-[550px] w-[90vw] h-[70vh] bg-[#0f1115] text-white rounded-2xl border border-white/10 shadow-2xl shadow-black/40 p-4 flex flex-col gap-3 transition-all duration-300 ${
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-[0.3em] uppercase text-slate-200">QShield Assistant</h3>
            <p className="text-xs text-slate-400 mt-1">Select an option to explore insights</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-slate-300 hover:text-white transition-colors"
            aria-label="Close assistant"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div ref={scrollRef} className="bg-[#12151b] rounded-xl p-3 flex-1 overflow-y-auto flex flex-col gap-2 text-sm">
          {messages.length === 0 ? (
            <div className="self-start bg-gray-700/80 text-white px-3 py-2 rounded-xl max-w-[80%] whitespace-pre-line">
              Hi, I can help you understand your scan. Click a button below.
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={`${msg.type}-${index}`}
                className={
                  msg.type === 'user'
                    ? 'self-end bg-blue-500 text-white px-3 py-2 rounded-xl max-w-[80%] whitespace-pre-line'
                    : 'self-start bg-gray-700/80 text-white px-3 py-2 rounded-xl max-w-[80%] whitespace-pre-line'
                }
              >
                {msg.text}
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-auto">
          {ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => handleAction(action.key, action.label)}
              className="text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-150 px-3 py-2 text-left"
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function buildResponse(type, { summary, assets, vulnerabilities, assetBreakdown }) {
  if (type === 'summary') {
    const totalAssets = summary.total_assets ?? 0;
    const highRiskAssets = summary.high_risk_assets ?? 0;
    const expiringSoon = summary.expiring_soon ?? 0;
    const riskLevel = summary.risk_level ?? summary.risk ?? 'Unknown';
    return `You scanned ${totalAssets} assets.\n${highRiskAssets} are high risk.\n${expiringSoon} certificates are expiring.\nOverall risk level is ${riskLevel}.`;
  }

  if (type === 'highRisk') {
    const highRisk = assets.filter((asset) => asset.risk === 'High').map((asset) => asset.domain).filter(Boolean);
    if (highRisk.length === 0) {
      return 'No high risk assets detected.';
    }
    return `High risk assets: ${formatDomainList(highRisk)}`;
  }

  if (type === 'certs') {
    const flagged = assets.filter((asset) => isExpiringSoon(asset.certificate_expiry));
    if (flagged.length === 0) {
      return 'No certificate issues detected.';
    }
    const labels = flagged.map((asset) => asset.domain || asset.ip || 'Unknown asset');
    return `Certificate issues found for: ${formatDomainList(labels)}`;
  }

  if (type === 'vulns') {
    if (!vulnerabilities || vulnerabilities.length === 0) {
      return 'No vulnerabilities detected.';
    }
    return `${vulnerabilities.length} vulnerabilities detected.`;
  }

  if (type === 'recs') {
    return 'Recommendations:\n- Enable HSTS\n- Add CSP\n- Upgrade TLS';
  }

  if (type === 'breakdown') {
    return `Asset breakdown:\nWeb Apps: ${assetBreakdown.webApps}\nAPIs: ${assetBreakdown.apis}\nServers: ${assetBreakdown.servers}`;
  }

  return 'Select an option to explore insights.';
}
