import { useMemo, useState } from 'react';

const domainRegex = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;
const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;

const sanitizeDomain = (value) => {
  if (!value) return '';
  let sanitized = value.trim().toLowerCase();
  sanitized = sanitized.replace(/^https?:\/\//, '');
  sanitized = sanitized.replace(/^www\./, '');
  sanitized = sanitized.replace(/\/+$/, '');
  return sanitized;
};

const isValidDomain = (value) => domainRegex.test(value) || ipRegex.test(value);

export default function TopBar({ onScan }) {
  const [domain, setDomain] = useState('');
  const [inputError, setInputError] = useState('');
  const [useCrtsh, setUseCrtsh] = useState(false);

  const handleSubmit = () => {
    setInputError('');
    const sanitized = sanitizeDomain(domain);
    if (!sanitized) {
      setInputError('Please enter a domain to scan.');
      return;
    }
    if (!isValidDomain(sanitized)) {
      setInputError('Enter a valid domain without protocol.');
      return;
    }
    setDomain(sanitized);
    onScan(sanitized, { use_crtsh: useCrtsh });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const helperText = useMemo(() => {
    if (inputError) return inputError;
    return 'Enter a fully qualified domain (no protocol).';
  }, [inputError]);

  return (
    <header className="fixed top-0 right-0 left-64 h-16 flex items-center justify-between px-6 z-40 bg-white/80 backdrop-blur-xl border-b border-outline-variant/40 shadow-[0_4px_24px_rgba(15,23,42,0.02)]">
      <div className="flex items-center gap-3">
        <h2 className="font-inter text-base font-bold text-on-surface tracking-wide">Security Command Center</h2>
        <span className="h-4 w-[1px] bg-outline-variant/60"></span>
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Operational Mode</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[18px] pointer-events-none">search</span>
          <input
            className="bg-surface-container border border-outline-variant/50 rounded-full pl-10 pr-4 py-1.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 w-64 shadow-inner transition-all placeholder:text-on-surface-variant/50"
            placeholder="Scan domain (e.g. example.com)..."
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-invalid={Boolean(inputError)}
          />
          <div className="absolute left-0 top-full mt-1 pl-3 text-xs text-red-500 w-full overflow-hidden text-ellipsis whitespace-nowrap">{helperText}</div>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant select-none">
          <input
            type="checkbox"
            checked={useCrtsh}
            onChange={(e) => setUseCrtsh(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          crt.sh
        </label>
        <button
          className="px-4 py-1.5 rounded-full bg-primary text-white font-bold text-sm hover:bg-primary-variant hover:shadow-[0_4px_12px_rgba(181,10,46,0.2)] transition-all"
          onClick={handleSubmit}
        >
          Scan
        </button>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <button className="material-symbols-outlined hover:text-secondary transition-colors">notifications</button>
          <button className="material-symbols-outlined hover:text-secondary transition-colors">help_outline</button>
          <div className="h-8 w-8 rounded-full bg-primary-container overflow-hidden ring-2 ring-white shadow-sm">
            <img alt="Admin User" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI1xeVQb-lbsfGm_1pD2jJVu91VHZjIqoFxvsH_pf5-RAzdw3fUUV8kwk3o4FFp_U2tTxT9KWLX9w6ZjAnkwXk09adXdPhPaOghROJcPuFcxr42btjE9jBYBjNXp5Jnc_Y5RIbBfgWqCT7-_NiLeQuFNRq1-zaY-hk1hkvWyPbCsdhetULrPe9tW_ncKRhzLtuD1pmqKYy4N7xFXCjMi_r8DCDXMF853qh3z0UXnIw3SovrfHpL2LoP1c59PYT1l124X6gFrg5QG8" />
          </div>
        </div>
      </div>
    </header>
  );
}
