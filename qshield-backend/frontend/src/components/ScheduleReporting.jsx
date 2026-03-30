import { useState } from 'react';

const REPORT_TYPES = [
  { id: 'exec',      label: 'Executive Summary Report',    icon: 'bar_chart' },
  { id: 'discovery', label: 'Assets Discovery Report',     icon: 'track_changes' },
  { id: 'inventory', label: 'Assets Inventory',            icon: 'layers' },
  { id: 'cbom',      label: 'CBOM',                        icon: 'description' },
  { id: 'pqc',       label: 'Posture of PQC',              icon: 'security' },
  { id: 'cyber',     label: 'Cyber Rating (Tiers 1 – 4)',  icon: 'star_rate' },
];

const FREQUENCIES  = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly'];
const ASSET_OPTIONS = ['All Assets', 'High Risk Only', 'Expiring Soon', 'APIs Only', 'Servers Only'];

const SECTIONS = [
  { id: 'discovery',   label: 'Discovery' },
  { id: 'inventory',   label: 'Inventory' },
  { id: 'cbom',        label: 'CBOM' },
  { id: 'pqc',         label: 'PQC Posture' },
  { id: 'cyberRating', label: 'Cyber Rating' },
];

/* ── tiny shared sub-components ─────────────────────────────────────── */

function Dropdown({ value, options, onSelect, placeholder, renderLabel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-white border border-[#f1e6b8] rounded-xl px-4 py-3 flex items-center justify-between text-[#8c8581] shadow-sm hover:border-[#e5a03e] transition-colors"
      >
        <span className={value ? 'text-[#59534f] font-medium' : ''}>
          {value ? (renderLabel ? renderLabel(value) : value) : placeholder}
        </span>
        <span className="material-symbols-outlined text-[#e5a03e]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#f1e6b8] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] py-2 z-50">
          {options.map((opt) => (
            <button
              key={typeof opt === 'string' ? opt : opt.id}
              onClick={() => { onSelect(opt); setOpen(false); }}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#fff9f0] text-left transition-colors"
            >
              {opt.icon && (
                <span className="material-symbols-outlined text-[#e5a03e] text-xl">{opt.icon}</span>
              )}
              <span className="text-[#59534f] font-medium text-sm">
                {typeof opt === 'string' ? opt : opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${value ? 'bg-[#e5a03e] justify-end' : 'bg-[#e8e4db] justify-start'}`}
    >
      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
    </button>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${checked ? 'bg-[#e5a03e] border-[#e5a03e]' : 'border-[#d8d1ca]'}`}
    >
      {checked && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
    </button>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function todayStr()   { return new Date().toISOString().split('T')[0]; }
function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function formatDateNice(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm} (IST)`;
}

/* ── main component ──────────────────────────────────────────────────── */

export default function ScheduleReporting() {
  const [enabled, setEnabled]       = useState(true);
  const [reportType, setReportType] = useState(null);
  const [frequency, setFrequency]   = useState('Weekly');
  const [assets, setAssets]         = useState('All Assets');
  const [sections, setSections]     = useState(
    Object.fromEntries(SECTIONS.map((s) => [s.id, true]))
  );

  // Schedule date/time
  const [scheduleDate, setScheduleDate] = useState(todayStr());
  const [scheduleTime, setScheduleTime] = useState(nowTimeStr());

  // Delivery
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState('');
  const [saveEnabled, setSaveEnabled]   = useState(true);
  const [savePath, setSavePath]         = useState('/Reports/Quarterly/');
  const [downloadLink, setDownloadLink] = useState(false);

  // UI state
  const [isScheduling, setIsScheduling] = useState(false);
  const [result, setResult]             = useState(null); // { ok, message }

  const toggleSection = (id) =>
    setSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const buildRunAt = () => `${scheduleDate}T${scheduleTime}:00`;

  const handleSchedule = async () => {
    if (!reportType) { setResult({ ok: false, message: 'Please select a Report Type.' }); return; }
    if (emailEnabled && !emailAddress.trim()) { setResult({ ok: false, message: 'Please enter an email address.' }); return; }

    const runAt = buildRunAt();
    const nowISO = new Date().toISOString();
    if (new Date(runAt) <= new Date()) {
      setResult({ ok: false, message: 'Scheduled time must be in the future.' });
      return;
    }

    setIsScheduling(true);
    setResult(null);

    try {
      const res = await fetch('http://localhost:8000/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type:   reportType.id,
          frequency,
          assets,
          sections,
          run_at:        runAt,
          email:         emailEnabled ? emailAddress.trim() : '',
          save_path:     saveEnabled  ? savePath            : null,
          download_link: downloadLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Server error');
      setResult({
        ok: true,
        message: `✓ Scheduled! "${reportType.label}" will be emailed to ${data.email} on ${formatDateNice(scheduleDate)} at ${fmtTime(scheduleTime)}.`,
      });
    } catch (err) {
      setResult({ ok: false, message: `Error: ${err.message}` });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <section className="col-span-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined text-4xl text-[#e5a03e]">calendar_month</span>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <span className="material-symbols-outlined text-sm text-[#e5a03e]">schedule</span>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-[#4a4542] tracking-tight">Schedule Reporting</h2>
            <p className="text-[#8c8581] font-medium text-sm mt-0.5">Automate recurring report delivery</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#59534f] font-medium text-sm">Enable Schedule</span>
          <Toggle value={enabled} onChange={setEnabled} />
        </div>
      </div>

      {/* Card */}
      <div className={`bg-[#fefaf6] rounded-2xl shadow-sm border border-[#f3ecd8] p-8 relative overflow-hidden transition-opacity duration-300 ${!enabled ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-20">

          {/* ── LEFT ── */}
          <div className="space-y-6">

            {/* Report Type */}
            <div className="space-y-2 relative z-50">
              <h3 className="text-[#59534f] font-bold text-base px-2">Report Type</h3>
              <Dropdown
                value={reportType}
                options={REPORT_TYPES}
                onSelect={setReportType}
                placeholder="Select Report"
                renderLabel={(v) => v.label}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2 relative z-40">
              <h3 className="text-[#59534f] font-bold text-base px-2">Frequency</h3>
              <Dropdown
                value={frequency}
                options={FREQUENCIES}
                onSelect={setFrequency}
                placeholder="Select Frequency"
              />
            </div>

            {/* Select Assets */}
            <div className="space-y-2 relative z-30">
              <h3 className="text-[#59534f] font-bold text-base px-2">Select Assets</h3>
              <Dropdown
                value={assets}
                options={ASSET_OPTIONS}
                onSelect={setAssets}
                placeholder="All Assets"
              />
            </div>

            {/* Include Sections */}
            <div className="space-y-3 px-2">
              <h3 className="text-[#59534f] font-bold text-base">Include Sections</h3>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {SECTIONS.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={sections[s.id]} onChange={() => toggleSection(s.id)} />
                    <span className="text-[#59534f] font-medium text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Chevron divider */}
          <div className="hidden md:flex absolute left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 z-10">
            <span className="material-symbols-outlined text-[#e5a03e] text-3xl font-light">chevron_right</span>
          </div>

          {/* ── RIGHT ── */}
          <div className="space-y-6">

            {/* Schedule Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e5a03e]">calendar_today</span>
                <h3 className="text-[#59534f] font-bold text-base">Schedule Details</h3>
              </div>

              {/* Date picker */}
              <div className="space-y-1.5">
                <span className="text-[#8c8581] text-xs font-semibold uppercase tracking-wider px-1">Date</span>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="material-symbols-outlined text-[#e5a03e] text-lg">event</span>
                  </div>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={todayStr()}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-white border border-[#f1e6b8] rounded-xl pl-11 pr-4 py-3 text-[#59534f] font-medium text-sm shadow-sm focus:outline-none focus:border-[#e5a03e] transition-colors"
                  />
                </div>
              </div>

              {/* Time picker — native <input type="time"> */}
              <div className="space-y-1.5">
                <span className="text-[#8c8581] text-xs font-semibold uppercase tracking-wider px-1">Time</span>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="material-symbols-outlined text-[#e5a03e] text-lg">schedule</span>
                  </div>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-white border border-[#f1e6b8] rounded-xl pl-11 pr-4 py-3 text-[#59534f] font-medium text-sm shadow-sm focus:outline-none focus:border-[#e5a03e] transition-colors"
                  />
                </div>
                <p className="text-[#8c8581] text-xs px-1">
                  Time Zone: <span className="font-semibold text-[#59534f]">Asia/Kolkata (IST)</span>
                </p>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e5a03e]">mail</span>
                <h3 className="text-[#59534f] font-bold text-base">Delivery Options</h3>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={emailEnabled} onChange={setEmailEnabled} />
                    <span className="text-[#59534f] font-medium text-sm">Email</span>
                  </div>
                  {emailEnabled && (
                    <div className="relative pl-8">
                      <input
                        type="email"
                        placeholder="executives@org.com"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="w-full bg-[#fbf8f1] border border-[#f1e6b8] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#59534f] placeholder-[#c4bbb6] focus:outline-none focus:border-[#e5a03e]"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#e5a03e]">
                        <span className="material-symbols-outlined text-lg">add</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Save to Location */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={saveEnabled} onChange={setSaveEnabled} />
                    <span className="text-[#59534f] font-medium text-sm">Save to Location</span>
                  </div>
                  {saveEnabled && (
                    <div className="relative pl-8">
                      <input
                        type="text"
                        value={savePath}
                        onChange={(e) => setSavePath(e.target.value)}
                        className="w-full bg-[#fbf8f1] border border-[#f1e6b8] rounded-xl pl-4 pr-9 py-2.5 text-sm text-[#59534f] focus:outline-none focus:border-[#e5a03e]"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#e5a03e]">
                        <span className="material-symbols-outlined text-lg">folder</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Download Link */}
                <div className="flex items-center gap-3">
                  <Checkbox checked={downloadLink} onChange={setDownloadLink} />
                  <span className="text-[#59534f] font-medium text-sm">Download Link</span>
                  <span className="material-symbols-outlined text-[#c4bbb6] ml-auto">link</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-[#f3ecd8] relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {result ? (
              <p className={`text-sm font-semibold rounded-xl px-4 py-2 flex-1 ${result.ok ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-700 bg-red-50 border border-red-200'}`}>
                {result.message}
              </p>
            ) : (
              <p className="text-xs text-[#8c8581] font-medium">
                Next run: <span className="text-[#59534f] font-semibold">{formatDateNice(scheduleDate)}</span>
                {scheduleTime && <> · <span className="text-[#59534f] font-semibold">{fmtTime(scheduleTime)}</span></>}
              </p>
            )}

            <button
              onClick={handleSchedule}
              disabled={isScheduling}
              className={`flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-md ml-auto ${isScheduling ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#e5a03e] hover:bg-[#d4902b] shadow-[#e5a03e]/20'}`}
            >
              {isScheduling
                ? <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                : <span className="material-symbols-outlined text-xl">arrow_forward</span>}
              {isScheduling ? 'Scheduling...' : 'Schedule Report'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
