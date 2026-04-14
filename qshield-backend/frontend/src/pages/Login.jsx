import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/* ── Topographic SVG inline (same as main app background) ── */
const TopoBg = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <pattern id="topo" x="0" y="0" width="600" height="400" patternUnits="userSpaceOnUse">
        <path d="M-50 30C50 10,150 50,250 30C350 10,450 50,650 30" fill="none" stroke="rgba(181,10,46,.06)" strokeWidth="1.2"/>
        <path d="M-50 67C30 47,130 82,230 62C330 42,430 77,650 67" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1"/>
        <path d="M-50 104C70 79,170 114,270 94C370 74,470 109,650 104" fill="none" stroke="rgba(250,188,10,.07)" strokeWidth="1"/>
        <path d="M-50 142C40 117,140 152,240 132C340 112,440 147,650 142" fill="none" stroke="rgba(181,10,46,.05)" strokeWidth="1"/>
        <path d="M-50 180C60 155,160 190,260 170C360 150,460 185,650 180" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1.2"/>
        <path d="M-50 218C50 193,150 228,250 208C350 188,450 223,650 218" fill="none" stroke="rgba(250,188,10,.06)" strokeWidth="1"/>
        <path d="M-50 256C70 231,170 266,270 246C370 226,470 261,650 256" fill="none" stroke="rgba(181,10,46,.05)" strokeWidth="1"/>
        <path d="M-50 294C40 269,140 304,240 284C340 264,440 299,650 294" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1"/>
        <path d="M-50 331C60 306,160 341,260 321C360 301,460 336,650 331" fill="none" stroke="rgba(250,188,10,.07)" strokeWidth="1.2"/>
        <path d="M-50 368C50 343,150 378,250 358C350 338,450 373,650 368" fill="none" stroke="rgba(181,10,46,.05)" strokeWidth="1"/>
        <ellipse cx="155" cy="195" rx="108" ry="68" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1"/>
        <ellipse cx="155" cy="195" rx="72" ry="45" fill="none" stroke="rgba(181,10,46,.055)" strokeWidth="1"/>
        <ellipse cx="155" cy="195" rx="40" ry="25" fill="none" stroke="rgba(250,188,10,.09)" strokeWidth="1.2"/>
        <ellipse cx="155" cy="195" rx="18" ry="11" fill="none" stroke="rgba(250,188,10,.12)" strokeWidth="1"/>
        <ellipse cx="462" cy="112" rx="90" ry="56" fill="none" stroke="rgba(181,10,46,.04)" strokeWidth="1"/>
        <ellipse cx="462" cy="112" rx="58" ry="36" fill="none" stroke="rgba(250,188,10,.07)" strokeWidth="1"/>
        <ellipse cx="462" cy="112" rx="30" ry="19" fill="none" stroke="rgba(181,10,46,.07)" strokeWidth="1"/>
        <ellipse cx="488" cy="322" rx="76" ry="48" fill="none" stroke="rgba(250,188,10,.06)" strokeWidth="1"/>
        <ellipse cx="488" cy="322" rx="48" ry="30" fill="none" stroke="rgba(181,10,46,.055)" strokeWidth="1"/>
        <ellipse cx="488" cy="322" rx="24" ry="15" fill="none" stroke="rgba(250,188,10,.09)" strokeWidth="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#topo)"/>
  </svg>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, icon, required }) => (
  <div>
    <label className="block text-[10px] font-black text-[#594141] uppercase tracking-[0.18em] mb-1.5">{label}</label>
    <div className="relative">
      {icon && (
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#8d7070] pointer-events-none">
          {icon}
        </span>
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

/* ── 2FA Code Input ── */
const OtpInput = ({ value, onChange }) => {
  const digits = (value + '      ').slice(0, 6).split('');
  return (
    <div className="flex gap-2 justify-center my-4">
      {digits.map((d, i) => (
        <div
          key={i}
          className={`w-11 h-13 flex items-center justify-center text-xl font-black rounded-lg border-2 transition-all ${
            i < value.length ? 'border-[#B50A2E] bg-[#fdf0f0] text-[#B50A2E]' : 'border-[#e5dfd3] bg-white/60 text-transparent'
          }`}
        >
          {d.trim() || (i === value.length ? <span className="animate-pulse text-[#B50A2E]">|</span> : '')}
        </div>
      ))}
    </div>
  );
};

export default function Login() {
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Auto-submit 2FA when 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && step === '2fa') handle2FA();
  }, [otpCode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });
      if (!response.ok) throw new Error('Invalid email or password');
      const data = await response.json();
      if (data.require_2fa) {
        setPendingEmail(email);
        setStep('2fa');
      } else {
        login(data.access_token, data.refresh_token);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code: otpCode }),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.detail || 'Invalid 2FA code');
      }
      const data = await response.json();
      login(data.access_token, data.refresh_token);
      navigate('/');    } catch (err) {
      setError(err.message);
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#fdf9f2] relative overflow-hidden">
      <TopoBg />

      {/* ── Left maroon branding panel ── */}
      <div
        className="hidden lg:flex relative flex-col justify-between w-[420px] p-12 overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(160deg, #C0122F 0%, #9A0820 45%, #6A0318 100%)' }}
      >
        {/* Panel noise */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        />
        {/* Gold glow orb */}
        <div className="absolute top-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(250,188,10,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-40px] left-[-40px] w-[220px] h-[220px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(250,188,10,0.12) 0%, transparent 70%)' }} />

        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* Brand */}
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
            Security<br />Command<br />Center
          </h2>
          <p className="text-white/55 text-sm mt-4 leading-relaxed max-w-[260px]">
            Quantum-safe cryptographic monitoring and threat intelligence for enterprise infrastructure.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {[
            { icon: 'lock', text: 'Post-Quantum Cryptography Analysis' },
            { icon: 'security', text: 'Real-time Asset Monitoring' },
            { icon: 'verified_user', text: 'Certificate Lifecycle Management' },
            { icon: 'radar', text: 'Vulnerability Intelligence' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#FABC0A] text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
              </div>
              <span className="text-white/70 text-xs font-medium">{text}</span>
            </div>
          ))}
        </div>

        <p className="relative z-10 text-white/25 text-[10px] tracking-widest uppercase">© 2025 Requiem Security</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">

          {/* Card */}
          <div
            className="rounded-2xl border border-[#e5dfd3] shadow-2xl shadow-[#B50A2E]/8 p-8 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(253,251,246,0.97) 0%, rgba(248,244,236,0.97) 100%)', backdropFilter: 'blur(24px)' }}
          >
            {/* Card top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FABC0A]/30 to-transparent" />

            {step === 'credentials' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-[28px] font-black text-[#721c24] tracking-tight leading-tight">Welcome back</h2>
                  <p className="text-[#8d7070] text-sm mt-1">Sign in to your Requiem account</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-5 text-sm">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
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
                        placeholder="••••••••"
                        className="w-full bg-white/70 border border-[#e1bebe] pl-10 pr-10 py-3 text-[#1d1b19] text-sm rounded-xl focus:outline-none focus:border-[#B50A2E] focus:ring-2 focus:ring-[#B50A2E]/15 focus:bg-white transition-all duration-200 placeholder:text-[#b89898]"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8d7070] hover:text-[#B50A2E] transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-[#B50A2E]/25 hover:shadow-[#B50A2E]/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{ background: 'linear-gradient(135deg, #C0122F 0%, #8A0520 100%)' }}
                  >
                    {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> : null}
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-[#8d7070]">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-[#B50A2E] font-bold hover:text-[#8A0520] transition-colors">Sign up</Link>
                </div>
              </>
            ) : (
              /* ── 2FA Step ── */
              <>
                <button onClick={() => { setStep('credentials'); setOtpCode(''); setError(null); }}
                  className="flex items-center gap-1 text-[#8d7070] hover:text-[#B50A2E] text-xs font-bold uppercase tracking-widest mb-6 transition-colors">
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span> Back
                </button>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #FABC0A 0%, #D49D00 100%)' }}>
                    <span className="material-symbols-outlined text-white text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>phonelink_lock</span>
                  </div>
                  <h2 className="text-[22px] font-black text-[#721c24] tracking-tight">Two-Factor Auth</h2>
                  <p className="text-[#8d7070] text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
                  <p className="text-[10px] font-bold text-[#B50A2E] tracking-widest uppercase mt-1">{pendingEmail}</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-3 text-sm">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {error}
                  </div>
                )}

                <OtpInput value={otpCode} onChange={setOtpCode} />

                {/* Hidden input to capture keystrokes */}
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="opacity-0 absolute w-0 h-0"
                />

                <button
                  onClick={handle2FA}
                  disabled={otpCode.length < 6 || loading}
                  className="w-full text-white font-black py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-[#B50A2E]/25 hover:shadow-[#B50A2E]/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #C0122F 0%, #8A0520 100%)' }}
                >
                  {loading ? <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span> : null}
                  {loading ? 'Verifying…' : 'Verify Code'}
                </button>

                <p className="text-center text-[11px] text-[#8d7070] mt-4">
                  Code refreshes every 30 seconds. Open your authenticator app.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
