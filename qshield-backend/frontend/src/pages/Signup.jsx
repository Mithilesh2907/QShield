import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/* ── Topographic SVG background (same as Login) ── */
const TopoBg = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="topo2" x="0" y="0" width="600" height="400" patternUnits="userSpaceOnUse">
        <path d="M-50 30C50 10,150 50,250 30C350 10,450 50,650 30" fill="none" stroke="rgba(181,10,46,.06)" strokeWidth="1.2" />
        <path d="M-50 67C30 47,130 82,230 62C330 42,430 77,650 67" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1" />
        <path d="M-50 104C70 79,170 114,270 94C370 74,470 109,650 104" fill="none" stroke="rgba(250,188,10,.07)" strokeWidth="1" />
        <path d="M-50 142C40 117,140 152,240 132C340 112,440 147,650 142" fill="none" stroke="rgba(181,10,46,.05)" strokeWidth="1" />
        <path d="M-50 180C60 155,160 190,260 170C360 150,460 185,650 180" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1.2" />
        <path d="M-50 218C50 193,150 228,250 208C350 188,450 223,650 218" fill="none" stroke="rgba(250,188,10,.06)" strokeWidth="1" />
        <path d="M-50 256C70 231,170 266,270 246C370 226,470 261,650 256" fill="none" stroke="rgba(181,10,46,.05)" strokeWidth="1" />
        <path d="M-50 294C40 269,140 304,240 284C340 264,440 299,650 294" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1" />
        <path d="M-50 331C60 306,160 341,260 321C360 301,460 336,650 331" fill="none" stroke="rgba(250,188,10,.07)" strokeWidth="1.2" />
        <ellipse cx="462" cy="112" rx="90" ry="56" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1" />
        <ellipse cx="462" cy="112" rx="58" ry="36" fill="none" stroke="rgba(250,188,10,.07)" strokeWidth="1" />
        <ellipse cx="462" cy="112" rx="30" ry="19" fill="none" stroke="rgba(181,10,46,.07)" strokeWidth="1" />
        <ellipse cx="155" cy="300" rx="76" ry="48" fill="none" stroke="rgba(250,188,10,.06)" strokeWidth="1" />
        <ellipse cx="155" cy="300" rx="48" ry="30" fill="none" stroke="rgba(181,10,46,.055)" strokeWidth="1" />
        <ellipse cx="155" cy="300" rx="24" ry="15" fill="none" stroke="rgba(250,188,10,.09)" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#topo2)" />
  </svg>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, icon, required }) => (
  <div>
    <label className="block text-[10px] font-black text-[#594141] uppercase tracking-[0.18em] mb-1.5">{label}</label>
    <div className="relative">
      {icon && (
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#8d7070] pointer-events-none">{icon}</span>
      )}
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-white/70 border border-[#e1bebe] ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 text-[#1d1b19] text-sm rounded-xl focus:outline-none focus:border-[#B50A2E] focus:ring-2 focus:ring-[#B50A2E]/15 focus:bg-white transition-all duration-200 placeholder:text-[#b89898]`}
      />
    </div>
  </div>
);

const PrimaryBtn = ({ children, onClick, disabled, type = 'button', loading }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className="w-full text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-[#B50A2E]/25 hover:shadow-[#B50A2E]/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    style={{ background: 'linear-gradient(135deg, #C0122F 0%, #8A0520 100%)' }}
  >
    {loading && <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>}
    {children}
  </button>
);

export default function Signup() {
  const [step, setStep] = useState('form');         // 'form' | 'setup2fa' | 'confirm2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);       // QR code data URL
  const [totpSecret, setTotpSecret] = useState(''); // backup secret key
  const [otpCode, setOtpCode] = useState('');
  const [enable2FA, setEnable2FA] = useState(true);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // FastAPI Pydantic 422 errors return detail as an array of objects like:
  // [{ loc: [...], msg: '...', type: '...' }]
  // This helper extracts a clean human-readable string from either format.
  const parseApiError = (detail) => {
    if (!detail) return 'Something went wrong';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(e => e.msg || String(e)).join('. ');
    return JSON.stringify(detail);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPw) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(parseApiError(d.detail));
      }
      // If user wants 2FA, go to setup
      if (enable2FA) {
        await initiate2FASetup();
      } else {
        // Login directly
        const loginRes = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username: email, password }),
        });
        const loginData = await loginRes.json();
        login(loginData.access_token, loginData.refresh_token);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initiate2FASetup = async () => {
    setLoading(true);
    try {
      // 1. Login first — new user has no 2FA yet, returns token directly
      const loginRes = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });
      if (!loginRes.ok) throw new Error('Login after registration failed');
      const { access_token } = await loginRes.json();

      // 2. GET /auth/2fa/setup — generates TOTP secret + QR code (Bearer token required)
      const setupRes = await fetch('/auth/2fa/setup', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}` },
      });
      if (!setupRes.ok) throw new Error('Failed to generate 2FA secret');
      const setupData = await setupRes.json();

      // Save token temporarily for the /2fa/enable step
      sessionStorage.setItem('_signup_token', access_token);

      setQrData(setupData.qr_code);
      setTotpSecret(setupData.secret);
      setStep('setup2fa');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm2FA = async () => {
    setError(null);
    setLoading(true);
    try {
      const accessToken = sessionStorage.getItem('_signup_token');
      if (!accessToken) throw new Error('Session expired. Please restart signup.');

      // 3. POST /auth/2fa/enable — confirm code, activates 2FA on the account
      const enableRes = await fetch('/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code: otpCode }),
      });
      if (!enableRes.ok) {
        const d = await enableRes.json();
        throw new Error(d.detail || 'Invalid code — check your authenticator app');
      }
      sessionStorage.removeItem('_signup_token');

      // 4. Re-login — now backend requires 2FA since it's enabled
      const loginRes = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });
      const loginData = await loginRes.json();

      if (loginData.requires_2fa && loginData.temp_token) {
        // Same OTP code likely still valid within the 30s window
        const verRes = await fetch('/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temp_token: loginData.temp_token, code: otpCode }),
        });
        if (!verRes.ok) {
          // Code expired — send user to login page to re-verify
          navigate('/login');
          return;
        }
        const verData = await verRes.json();
        login(verData.access_token, verData.refresh_token);
      } else {
        login(loginData.access_token, loginData.refresh_token);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const skip2FA = async () => {
    sessionStorage.removeItem('_signup_token');
    setLoading(true);
    try {
      const loginRes = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });
      const loginData = await loginRes.json();
      login(loginData.access_token, loginData.refresh_token);
      navigate('/');
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#fdf9f2] relative overflow-hidden">
      <TopoBg />

      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex relative flex-col justify-between w-[420px] p-12 overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(160deg, #C0122F 0%, #9A0820 45%, #6A0318 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        <div className="absolute top-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(250,188,10,0.18) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #FABC0A 0%, #D49D00 100%)' }}>
              <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            </div>
            <h1 className="text-[18px] font-black text-white tracking-tight uppercase">Requiem</h1>
          </div>
          <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, rgba(250,188,10,0.5) 0%, rgba(255,255,255,0.08) 70%, transparent 100%)' }} />
          <h2 className="text-[32px] font-black text-white leading-tight tracking-tight">
            Join the<br />Requiem<br />Platform
          </h2>
          <p className="text-white/55 text-sm mt-4 leading-relaxed max-w-[260px]">
            Create your secure account and gain visibility into your entire cryptographic attack surface.
          </p>
        </div>

        {/* Step indicators */}
        <div className="relative z-10">
          {[
            { num: 1, label: 'Create account', active: step === 'form' },
            { num: 2, label: 'Set up 2FA', active: step === 'setup2fa' },
            { num: 3, label: 'Verify & enter', active: step === 'confirm2fa' },
          ].map(({ num, label, active }) => (
            <div key={num} className="flex items-center gap-3 mb-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 shrink-0 transition-all ${active ? 'bg-secondary border-secondary text-on-secondary shadow-[0_0_12px_rgba(250,188,10,0.5)]' : 'bg-white/10 border-white/20 text-white/50'}`}>
                {num}
              </div>
              <span className={`text-xs font-semibold transition-all ${active ? 'text-white' : 'text-white/40'}`}>{label}</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-white/25 text-[10px] tracking-widest uppercase">© 2025 Requiem Security</p>
      </div>

      {/* ── Right form ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div
            className="rounded-2xl border border-[#e5dfd3] shadow-2xl shadow-[#B50A2E]/8 p-8 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(253,251,246,0.97) 0%, rgba(248,244,236,0.97) 100%)', backdropFilter: 'blur(24px)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FABC0A]/30 to-transparent" />

            {/* ── Step 1: Registration form ── */}
            {step === 'form' && (
              <>
                <div className="mb-7">
                  <h2 className="text-[28px] font-black text-[#721c24] tracking-tight leading-tight">Create account</h2>
                  <p className="text-[#8d7070] text-sm mt-1">Join Requiem to start monitoring your assets</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-5 text-sm">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@requiem.com" icon="mail" required />
                  <div>
                    <label className="block text-[10px] font-black text-[#594141] uppercase tracking-[0.18em] mb-1.5">Password</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#8d7070] pointer-events-none">lock</span>
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full bg-white/70 border border-[#e1bebe] pl-10 pr-10 py-3 text-[#1d1b19] text-sm rounded-xl focus:outline-none focus:border-[#B50A2E] focus:ring-2 focus:ring-[#B50A2E]/15 focus:bg-white transition-all placeholder:text-[#b89898]"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d7070] hover:text-[#B50A2E] transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                  {/* Password strength hints */}
                  {password.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 mt-1">
                      {[
                        { ok: password.length >= 8,           label: '8+ chars' },
                        { ok: /[A-Z]/.test(password),         label: 'Uppercase' },
                        { ok: /[0-9]/.test(password),         label: 'Number' },
                        { ok: /[^A-Za-z0-9]/.test(password),  label: 'Special (!@#…)' },
                      ].map(({ ok, label }) => (
                        <span key={label} className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${
                          ok ? 'text-[#16a34a]' : 'text-[#b89898]'
                        }`}>
                          <span className="material-symbols-outlined text-[13px]">{ok ? 'check_circle' : 'radio_button_unchecked'}</span>
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  <InputField label="Confirm Password" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter password" icon="lock_reset" required />

                  {/* 2FA toggle */}
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${enable2FA ? 'border-[#FABC0A]/60 bg-[#fffbee]' : 'border-[#e5dfd3] bg-white/40'}`}
                    onClick={() => setEnable2FA(v => !v)}
                  >
                    <div className={`w-10 h-5 rounded-full relative transition-all shrink-0 ${enable2FA ? 'bg-[#FABC0A]' : 'bg-[#e5dfd3]'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${enable2FA ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-[#594141] uppercase tracking-widest">Enable 2FA</p>
                      <p className="text-[10px] text-[#8d7070]">Recommended — adds extra security</p>
                    </div>
                    <span className="material-symbols-outlined text-[#FABC0A] ml-auto text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {enable2FA ? 'verified_user' : 'shield'}
                    </span>
                  </div>

                  <PrimaryBtn type="submit" loading={loading}>
                    {enable2FA ? 'Create Account & Set Up 2FA' : 'Create Account'}
                  </PrimaryBtn>
                </form>

                <div className="mt-6 text-center text-sm text-[#8d7070]">
                  Already have an account?{' '}
                  <Link to="/login" className="text-[#B50A2E] font-bold hover:text-[#8A0520] transition-colors">Sign in</Link>
                </div>
              </>
            )}

            {/* ── Step 2: Scan QR ── */}
            {step === 'setup2fa' && (
              <>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #FABC0A 0%, #D49D00 100%)' }}>
                    <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
                  </div>
                  <h2 className="text-[22px] font-black text-[#721c24] tracking-tight">Scan QR Code</h2>
                  <p className="text-[#8d7070] text-sm mt-1">Use Google Authenticator, Authy, or any TOTP app</p>
                </div>

                {qrData ? (
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-white rounded-2xl border border-[#e5dfd3] shadow-sm">
                      <img src={qrData} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-[#8d7070] mb-4">QR generation requires the <code>qrcode</code> package</div>
                )}

                {/* Manual entry key */}
                <div className="bg-[#fdf0f0] border border-[#e1bebe] rounded-xl p-3 mb-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#594141] mb-1">Manual Entry Key</p>
                  <p className="font-mono text-[12px] text-[#721c24] font-bold tracking-widest break-all">{totpSecret}</p>
                </div>

                <PrimaryBtn onClick={() => setStep('confirm2fa')}>
                  I've scanned it — Continue
                </PrimaryBtn>
                <button onClick={skip2FA} className="w-full mt-3 text-[#8d7070] hover:text-[#594141] text-xs font-bold transition-colors py-2">
                  Skip for now
                </button>
              </>
            )}

            {/* ── Step 3: Confirm OTP ── */}
            {step === 'confirm2fa' && (
              <>
                <button onClick={() => setStep('setup2fa')}
                  className="flex items-center gap-1 text-[#8d7070] hover:text-[#B50A2E] text-xs font-bold uppercase tracking-widest mb-5 transition-colors">
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span> Back
                </button>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #B50A2E 0%, #8A0520 100%)' }}>
                    <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>phonelink_lock</span>
                  </div>
                  <h2 className="text-[22px] font-black text-[#721c24] tracking-tight">Verify Setup</h2>
                  <p className="text-[#8d7070] text-sm mt-1">Enter the 6-digit code from your authenticator app to confirm</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-sm">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {error}
                  </div>
                )}

                <div className="mb-4">
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-2xl font-black bg-white border-2 border-[#e1bebe] focus:border-[#B50A2E] focus:ring-2 focus:ring-[#B50A2E]/15 rounded-xl py-4 tracking-[0.4em] focus:outline-none transition-all"
                  />
                </div>

                <PrimaryBtn onClick={handleConfirm2FA} disabled={otpCode.length < 6} loading={loading}>
                  Confirm & Enter Dashboard
                </PrimaryBtn>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
