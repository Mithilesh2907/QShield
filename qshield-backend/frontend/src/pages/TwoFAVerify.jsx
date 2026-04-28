import { useState, useRef, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * TwoFAVerify — shown mid-login when the user has 2FA enabled.
 * Reads the temp_token from sessionStorage (stored by Login.jsx),
 * shows a single OTP input, and exchanges it for the real JWT on success.
 */
export default function TwoFAVerify() {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const tempToken = sessionStorage.getItem('2fa_temp_token');

  // If there's no temp token, go back to login
  useEffect(() => {
    if (!tempToken) {
      navigate('/login', { replace: true });
    } else {
      inputRef.current?.focus();
    }
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length < 6) {
      setError('Please enter all 6 digits from your authenticator app.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid code. Please try again.');
      }

      const data = await res.json();
      sessionStorage.removeItem('2fa_temp_token');
      login(data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setCode('');
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = code.length === 6;

  return (
    <div className="min-h-screen flex bg-[#fef8f3]">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-gradient-to-b from-[#6a0018] via-[#81001d] to-[#5c0014] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="grid3" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid3)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#C9A84C] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">QShield</h1>
              <p className="text-[10px] text-[#C9A84C] font-semibold tracking-[0.18em] uppercase">
                Quantum-Safe Security Platform
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <span
            className="material-symbols-outlined text-white/10 block mb-6"
            style={{ fontSize: '140px', fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
          <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
            One More Step<br/>
            <span className="text-[#C9A84C]">To Stay Secure</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Your account is protected with two-factor authentication. 
            Enter the code from your authenticator app to continue.
          </p>
        </div>

        <p className="text-white/25 text-xs relative z-10">
          © 2025 QShield. Punjab National Bank Security Services.
        </p>
      </div>

      {/* Right — OTP entry */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-sm w-full">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <span className="material-symbols-outlined text-[#81001d] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            <span className="text-lg font-bold text-[#81001d]">QShield</span>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#81001d]/10 border border-[#81001d]/20 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[#81001d] text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                phonelink_lock
              </span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#81001d] tracking-tight">
              Two-Factor Authentication
            </h2>
            <p className="text-[#594141] mt-2 text-sm">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-400/40 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-red-500 text-base mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Single OTP input — type all 6 digits without interruption */}
            <div className="mb-8">
              <input
                ref={inputRef}
                id="otp-code-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                className="w-full text-center text-3xl font-bold tracking-[0.5em] bg-white border-2 border-[#e1bebe] rounded-xl px-4 py-4 focus:outline-none focus:border-[#81001d] focus:ring-2 focus:ring-[#81001d]/20 transition-all text-[#1d1b19] placeholder:tracking-normal placeholder:text-[#8d7070] placeholder:text-base"
              />
              <p className="text-center text-xs text-[#8d7070] mt-2">
                {code.length}/6 digits entered
              </p>
            </div>

            <button
              id="2fa-verify-submit"
              type="submit"
              disabled={isLoading || !isComplete}
              className="w-full bg-gradient-to-r from-[#81001d] to-[#a51c30] hover:from-[#6a0018] hover:to-[#8e1829] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-[#81001d]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Verifying…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                  Verify Code
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#594141]">
            <Link
              to="/login"
              onClick={() => sessionStorage.removeItem('2fa_temp_token')}
              className="text-[#C9A84C] font-bold hover:text-[#81001d] transition-colors"
            >
              ← Back to Login
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-[#8d7070]">
            Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or{' '}
            <strong>Microsoft Authenticator</strong> to find your code.
          </p>
        </div>
      </div>
    </div>
  );
}
