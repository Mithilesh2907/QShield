import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// ── Module-level helpers (MUST be outside TwoFASetup to avoid remount on re-render) ──

const OtpInput = ({ value, onChange, id }) => (
  <input
    id={id}
    type="text"
    inputMode="numeric"
    maxLength={6}
    value={value}
    onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
    placeholder="000000"
    className="w-full text-center text-2xl font-bold tracking-[0.5em] bg-white border-2 border-[#e1bebe] rounded-xl px-4 py-3 focus:outline-none focus:border-[#81001d] focus:ring-2 focus:ring-[#81001d]/20 transition-all text-[#1d1b19] placeholder:tracking-normal placeholder:text-[#8d7070] placeholder:text-base"
  />
);

const SubmitButton = ({ onClick, label, disabled, isLoading }) => (
  <button
    onClick={onClick}
    disabled={disabled || isLoading}
    className="w-full bg-gradient-to-r from-[#81001d] to-[#a51c30] hover:from-[#6a0018] hover:to-[#8e1829] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-[#81001d]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
  >
    {isLoading ? (
      <>
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Processing…
      </>
    ) : label}
  </button>
);

/**
 * TwoFASetup — full-page 2FA management for authenticated users.
 * Handles the entire lifecycle: setup → QR scan → enable, and disable.
 */
export default function TwoFASetup() {
  const { token } = useContext(AuthContext);

  // 'loading' | 'disabled' | 'scanning' | 'confirming' | 'enabled' | 'disabling'
  const [view, setView] = useState('loading');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [enableCode, setEnableCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState(null);
  const [disableError, setDisableError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch current user status to know if 2FA is already on
  useEffect(() => {
    fetch('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setView(data.totp_enabled ? 'enabled' : 'disabled'))
      .catch(() => setView('disabled'));
  }, [token]);

  // ── Start setup: fetch QR code from backend ──────────────────────────────
  const handleStartSetup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/auth/2fa/setup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to initiate 2FA setup.');
      const data = await res.json();
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setView('scanning');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Confirm enable ───────────────────────────────────────────────────────
  const handleEnable = async () => {
    if (enableCode.length !== 6) {
      setError('Enter the full 6-digit code from your authenticator app.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: enableCode }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Verification failed. Please try again.');
      }
      setSuccessMsg('Two-factor authentication is now active on your account.');
      setView('enabled');
      setEnableCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Disable ──────────────────────────────────────────────────────────────
  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      setDisableError('Enter your current 6-digit code to confirm.');
      return;
    }
    setIsLoading(true);
    setDisableError(null);
    try {
      const res = await fetch('/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: disableCode }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Failed to disable 2FA.');
      }
      setSuccessMsg('');
      setView('disabled');
      setDisableCode('');
    } catch (err) {
      setDisableError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const OtpInput = ({ value, onChange, id }) => (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      className="w-full text-center text-2xl font-bold tracking-[0.5em] bg-white border-2 border-[#e1bebe] rounded-xl px-4 py-3 focus:outline-none focus:border-[#81001d] focus:ring-2 focus:ring-[#81001d]/20 transition-all text-[#1d1b19] placeholder:tracking-normal placeholder:text-[#8d7070] placeholder:text-base"
    />
  );

  const SubmitButton = ({ onClick, label, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full bg-gradient-to-r from-[#81001d] to-[#a51c30] hover:from-[#6a0018] hover:to-[#8e1829] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-[#81001d]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Processing…
        </>
      ) : label}
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fef8f3] py-12 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link to="/settings" className="text-[#C9A84C] text-sm font-bold hover:text-[#81001d] transition-colors flex items-center gap-1 mb-6">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Settings
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#81001d]/10 border border-[#81001d]/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#81001d] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield_lock
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#81001d]">Two-Factor Authentication</h1>
              <p className="text-sm text-[#594141]">Add an extra layer of security to your account</p>
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {view === 'loading' && (
          <div className="bg-white rounded-2xl border border-[#e1bebe] p-8 flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-[#81001d]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}

        {/* ── 2FA Disabled — invite setup ── */}
        {view === 'disabled' && (
          <div className="bg-white rounded-2xl border border-[#e1bebe] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#f0e0e0]">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8d7070] shrink-0" />
                <span className="text-sm font-semibold text-[#594141]">Not Enabled</span>
              </div>
              <p className="mt-3 text-sm text-[#594141] leading-relaxed">
                Two-factor authentication is currently <strong>off</strong>. Enable it to protect 
                your account with a time-based code from your authenticator app.
              </p>
            </div>

            {/* How it works */}
            <div className="p-6 space-y-3 border-b border-[#f0e0e0]">
              <p className="text-xs font-bold text-[#594141] uppercase tracking-widest">How it works</p>
              {[
                { icon: 'download', text: 'Install Google Authenticator, Authy, or Microsoft Authenticator on your phone.' },
                { icon: 'qr_code_scanner', text: 'Scan the QR code shown on the next screen.' },
                { icon: 'pin', text: 'Enter the 6-digit code from the app to confirm setup.' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#81001d]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[#81001d] text-sm">{step.icon}</span>
                  </div>
                  <p className="text-sm text-[#594141]">{step.text}</p>
                </div>
              ))}
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-500/10 border border-red-400/40 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <div className="p-6">
              <SubmitButton onClick={handleStartSetup} isLoading={isLoading} label={
                <><span className="material-symbols-outlined text-sm">qr_code</span> Set Up 2FA</>
              } />
            </div>
          </div>
        )}

        {/* ── Scanning — show QR code ── */}
        {view === 'scanning' && (
          <div className="bg-white rounded-2xl border border-[#e1bebe] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#f0e0e0]">
              <h2 className="font-bold text-[#81001d] mb-1">Step 1 — Scan this QR Code</h2>
              <p className="text-sm text-[#594141]">
                Open your authenticator app and scan the code below.
              </p>
            </div>

            {/* QR Code */}
            <div className="p-6 flex flex-col items-center gap-4 border-b border-[#f0e0e0]">
              <div className="p-3 bg-white border-2 border-[#e1bebe] rounded-2xl shadow-sm">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>

              {/* Manual entry fallback */}
              <details className="w-full">
                <summary className="text-xs text-[#C9A84C] font-bold cursor-pointer hover:text-[#81001d] transition-colors select-none">
                  Can't scan? Enter code manually
                </summary>
                <div className="mt-3 bg-[#fef8f3] border border-[#e1bebe] rounded-xl p-3">
                  <p className="text-xs text-[#594141] mb-1">Type this key into your app:</p>
                  <code className="block font-mono text-sm font-bold text-[#81001d] tracking-widest break-all">
                    {secret}
                  </code>
                </div>
              </details>
            </div>

            {/* Code entry */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="font-bold text-[#81001d] mb-1">Step 2 — Enter the Code</h2>
                <p className="text-sm text-[#594141] mb-4">
                  After scanning, enter the 6-digit code shown in your app to confirm setup.
                </p>
                <OtpInput id="2fa-enable-code" value={enableCode} onChange={setEnableCode} />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-400/40 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}

              <SubmitButton
                onClick={handleEnable}
                disabled={enableCode.length !== 6}
                isLoading={isLoading}
                label={<><span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span> Activate 2FA</>}
              />

              <button
                onClick={() => { setView('disabled'); setError(null); setEnableCode(''); }}
                className="w-full text-[#8d7070] text-sm hover:text-[#594141] transition-colors py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── 2FA Enabled ── */}
        {view === 'enabled' && (
          <div className="space-y-4">
            {successMsg && (
              <div className="bg-green-500/10 border border-green-400/40 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {successMsg}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-[#e1bebe] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#f0e0e0]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-sm font-semibold text-green-700">2FA is Active</span>
                </div>
                <p className="text-sm text-[#594141]">
                  Your account is protected. You will be asked for an authenticator code on every login.
                </p>
              </div>

              {/* Disable section */}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="font-bold text-[#81001d] mb-1">Disable Two-Factor Authentication</h2>
                  <p className="text-sm text-[#594141] mb-4">
                    To disable 2FA, enter your current authenticator code to confirm.
                  </p>
                  <OtpInput id="2fa-disable-code" value={disableCode} onChange={setDisableCode} />
                </div>

                {disableError && (
                  <div className="bg-red-500/10 border border-red-400/40 text-red-700 px-4 py-3 rounded-xl text-sm">{disableError}</div>
                )}

                <button
                  onClick={handleDisable}
                  disabled={isLoading || disableCode.length !== 6}
                  className="w-full bg-white hover:bg-red-50 border-2 border-red-300 hover:border-red-400 text-red-600 font-bold py-3 rounded-xl uppercase text-xs tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">lock_open</span>
                      Disable 2FA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
