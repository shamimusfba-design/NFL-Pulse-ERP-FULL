'use client';

import React, { FormEvent, useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Factory,
  Layers,
  CalendarCheck,
  BarChart3,
  Settings,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@nflbd.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // First-time admin password reset modal (Section 12 requirement: force change temporary password)
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [pendingUserData, setPendingUserData] = useState<any>(null);

  // Remember me persistence
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('nfl_saved_login_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide your Work Email or Employee ID and password.');
      return;
    }

    setLoading(true);
    setError(null);

    if (rememberMe) {
      try {
        localStorage.setItem('nfl_saved_login_email', email.trim());
      } catch {}
    } else {
      try {
        localStorage.removeItem('nfl_saved_login_email');
      } catch {}
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.user) {
        throw new Error(data?.message || 'Invalid email or password. Please verify credentials.');
      }

      // Check if temporary password needs first-time change
      if (password === 'ChangeMe123!' && email.toLowerCase().includes('admin')) {
        setPendingUserData(data);
        setShowFirstTimeModal(true);
        setLoading(false);
        return;
      }

      completeLogin(data);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication service unreachable. Please ensure the ERP server is active.');
    }
  }

  function completeLogin(data: any) {
    localStorage.setItem('nfl_access_token', data.accessToken || 'session-token');
    localStorage.setItem('nfl_refresh_token', data.refreshToken || 'session-refresh-token');
    localStorage.setItem('nfl_user', JSON.stringify(data.user));

    const userRoles: string[] = (data.user.roles || []).map((r: any) => String(r).toUpperCase());
    const isDirectorOrAdmin = userRoles.some(r => ['DIRECTOR', 'OWNER', 'ADMIN', 'SUPER ADMIN'].includes(r));

    const persona = {
      id: data.user.id,
      name: data.user.name || 'Enterprise User',
      role: data.user.roles?.[0] || 'ADMIN',
      assignedBuyer: 'ALL',
      email: data.user.email,
      avatar: (data.user.name || 'Admin').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
      department: isDirectorOrAdmin ? 'Executive Management' : 'Operations'
    };
    localStorage.setItem('nos_active_persona', JSON.stringify(persona));
    localStorage.setItem('nos-active-persona-id', data.user.id);
    localStorage.setItem('nos-user-role', persona.role);

    // Trigger key-and-lock unlock animation before redirect
    setIsUnlocked(true);
    setLoading(false);

    setTimeout(() => {
      if (isDirectorOrAdmin) {
        window.location.href = '/management';
      } else {
        window.location.href = '/';
      }
    }, 700);
  }

  function handlePasswordChangeSubmit(e: FormEvent) {
    e.preventDefault();
    setPassError(null);

    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword === 'ChangeMe123!') {
      setPassError('New password must be different from the temporary default password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Password confirmation does not match.');
      return;
    }

    // Password updated successfully, proceed to login
    setShowFirstTimeModal(false);
    if (pendingUserData) {
      completeLogin(pendingUserData);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row overflow-x-hidden font-sans bg-[#071F42]">
      {/* 1. Underlying Real Garment Factory Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/branding/factory-login-clean.jpg')",
          backgroundPosition: 'right 30% center'
        }}
      />

      {/* 2. Deep Navy Blue Curved Overlay on the Left Section (58%) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none hidden lg:block"
        style={{
          background: 'linear-gradient(90deg, #071F42 0%, #071F42 46%, rgba(7, 31, 66, 0.95) 54%, rgba(7, 31, 66, 0.4) 62%, rgba(7, 31, 66, 0) 70%)'
        }}
      />

      {/* Mobile/Tablet Overlay fallback */}
      <div className="absolute inset-0 z-[1] bg-[#071F42]/85 lg:hidden pointer-events-none" />

      {/* 3. Decorative Lime-Green & Cyan/Blue Curved Swooshes */}
      {/* Top-Right Decorative Accent Swoosh */}
      <div className="absolute top-0 right-0 z-[2] w-64 h-64 pointer-events-none overflow-hidden hidden sm:block">
        <svg viewBox="0 0 250 250" className="w-full h-full" fill="none">
          <path
            d="M 50 0 C 120 40, 190 110, 250 180 L 250 0 Z"
            fill="url(#topRightCyan)"
            opacity="0.85"
          />
          <path
            d="M 120 0 C 170 30, 210 70, 250 120 L 250 0 Z"
            fill="#A4D92C"
            opacity="0.95"
          />
          <defs>
            <linearGradient id="topRightCyan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e50a2" />
              <stop offset="100%" stopColor="#00b4d8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom-Right Decorative Accent Swoosh */}
      <div className="absolute bottom-0 right-0 z-[2] w-72 h-44 pointer-events-none overflow-hidden hidden sm:block">
        <svg viewBox="0 0 300 180" className="w-full h-full" fill="none">
          <path
            d="M 0 180 C 100 130, 200 100, 300 60 L 300 180 Z"
            fill="url(#botRightNavy)"
            opacity="0.9"
          />
          <path
            d="M 60 180 C 150 140, 230 130, 300 100 L 300 180 Z"
            fill="#A4D92C"
            opacity="0.85"
          />
          <path
            d="M 140 180 C 200 155, 260 150, 300 130 L 300 180 Z"
            fill="#0284c7"
            opacity="0.95"
          />
          <defs>
            <linearGradient id="botRightNavy" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#07345A" />
              <stop offset="100%" stopColor="#1e50a2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Subtle Lime-Green Curve line crossing lower left-to-center */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-[2] hidden lg:block overflow-hidden">
        <svg viewBox="0 0 1200 200" className="w-full h-full preserve-3d" fill="none">
          <path
            d="M 350 200 C 480 140, 620 120, 800 200"
            stroke="#A4D92C"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M 370 200 C 500 150, 640 135, 820 200"
            stroke="#1e50a2"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* =========================================================================
          LEFT SECTION (approx. 58% width): Corporate Branding, Headline & Feature Cards
         ========================================================================= */}
      <div className="relative z-10 w-full lg:w-[58%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 min-h-screen text-white select-none">
        {/* Top-Left Company Branding Header */}
        <div className="flex items-center gap-3">
          {/* Official Company Logo */}
          <img
            src="/branding/northern-fashions-logo.jpg"
            alt="Northern Fashions Limited"
            className="w-11 h-11 object-contain rounded-lg bg-white p-1 shadow-md flex-shrink-0"
          />

          {/* Thin Vertical Divider */}
          <div className="w-px h-9 bg-white/20 mx-1" />

          {/* Company Name & Enterprise Subtitle */}
          <div>
            <div className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
              Northern Fashions Limited
            </div>
            <div className="text-[11px] sm:text-xs text-slate-300 font-medium tracking-wide">
              Enterprise Resource Planning
            </div>
            {/* Subtle lime-green horizontal accent bar */}
            <div className="w-9 h-[3px] bg-[#A4D92C] rounded-full mt-1.5 shadow-sm" />
          </div>
        </div>

        {/* Center Headline & Five Glass-Effect Feature Cards */}
        <div className="my-auto py-8 lg:py-0 max-w-xl">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-white tracking-tight leading-[1.15]">
            Integrated ERP for <br />
            <span className="text-[#A4D92C]">Apparel Manufacturing</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-3.5 text-xs sm:text-sm text-slate-200 font-medium tracking-wide flex items-center gap-2">
            <span>Plan</span>
            <span className="text-slate-400 font-light">|</span>
            <span>Produce</span>
            <span className="text-slate-400 font-light">|</span>
            <span>Track</span>
            <span className="text-slate-400 font-light">|</span>
            <span>Control</span>
          </p>

          {/* Five Small Glass-Effect Feature Cards */}
          <div className="mt-8 flex flex-wrap gap-2.5 sm:gap-3">
            {/* Card 1: Production Management */}
            <div className="w-[100px] h-[86px] rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/15 p-2 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-200 hover:bg-white/[0.13] hover:border-white/30 hover:-translate-y-0.5">
              <Factory className="w-5 h-5 text-white mb-1.5 stroke-[1.8]" />
              <span className="text-[10.5px] font-medium leading-tight text-white/95">
                Production<br />Management
              </span>
            </div>

            {/* Card 2: Inventory & Materials */}
            <div className="w-[100px] h-[86px] rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/15 p-2 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-200 hover:bg-white/[0.13] hover:border-white/30 hover:-translate-y-0.5">
              <Layers className="w-5 h-5 text-white mb-1.5 stroke-[1.8]" />
              <span className="text-[10.5px] font-medium leading-tight text-white/95">
                Inventory &<br />Materials
              </span>
            </div>

            {/* Card 3: Order & Planning */}
            <div className="w-[100px] h-[86px] rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/15 p-2 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-200 hover:bg-white/[0.13] hover:border-white/30 hover:-translate-y-0.5">
              <CalendarCheck className="w-5 h-5 text-white mb-1.5 stroke-[1.8]" />
              <span className="text-[10.5px] font-medium leading-tight text-white/95">
                Order &<br />Planning
              </span>
            </div>

            {/* Card 4: Quality & Compliance */}
            <div className="w-[100px] h-[86px] rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/15 p-2 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-200 hover:bg-white/[0.13] hover:border-white/30 hover:-translate-y-0.5">
              <BarChart3 className="w-5 h-5 text-white mb-1.5 stroke-[1.8]" />
              <span className="text-[10.5px] font-medium leading-tight text-white/95">
                Quality &<br />Compliance
              </span>
            </div>

            {/* Card 5: Reports & Analytics */}
            <div className="w-[100px] h-[86px] rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/15 p-2 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-200 hover:bg-white/[0.13] hover:border-white/30 hover:-translate-y-0.5">
              <Settings className="w-5 h-5 text-white mb-1.5 stroke-[1.8]" />
              <span className="text-[10.5px] font-medium leading-tight text-white/95">
                Reports &<br />Analytics
              </span>
            </div>
          </div>
        </div>

        {/* Bottom-Left Footer */}
        <div className="flex items-center gap-2.5 pt-4">
          <ShieldCheck className="w-4 h-4 text-[#A4D92C] flex-shrink-0" />
          <div className="text-[11px] leading-snug">
            <span className="font-semibold text-slate-200">
              Northern Fashions Limited – ERP System v2.8.4
            </span>
            <span className="block text-slate-400 text-[10px]">
              © 2026 Northern Fashions Limited. All Rights Reserved.
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT SECTION (approx. 42% width): Large, Elegant White Login Card
         ========================================================================= */}
      <div className="relative z-10 w-full lg:w-[42%] flex items-center justify-center p-4 sm:p-8 lg:p-12 min-h-screen">
        <div className="w-full max-w-[420px] bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] p-7 sm:p-9 border border-slate-100 transition-all duration-300">
          {/* Official Company Logo inside the Card */}
          <div className="flex flex-col items-center text-center">
            <img
              src="/branding/northern-fashions-logo.jpg"
              alt="Northern Fashions Limited"
              className="h-12 w-auto object-contain rounded-md bg-white p-1 shadow-sm"
            />

            {/* Company Name & Operations Control Subtitle */}
            <h2 className="text-xl font-bold text-[#071F42] tracking-tight mt-3">
              Northern Fashions Limited
            </h2>
            <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">
              Apparel Manufacturing ERP – Operations Control
            </p>

            {/* Workspace Heading */}
            <h3 className="text-base sm:text-[17px] font-bold text-[#10254D] tracking-tight mt-5">
              Sign In to Your Workspace
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Authorized person only
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="mt-5 space-y-3.5">
            {/* Input 1: Work Email / Employee ID */}
            <div>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="text"
                  required
                  placeholder="Work Email / Employee ID"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || isUnlocked}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#D7E1ED] rounded-xl text-[#10254D] placeholder-slate-400 focus:outline-none focus:border-[#07834A] focus:ring-2 focus:ring-[#07834A]/15 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed shadow-sm"
                />
              </div>
            </div>

            {/* Input 2: Password with Lock Icon and Eye Toggle */}
            <div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || isUnlocked}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-[#D7E1ED] rounded-xl text-[#10254D] placeholder-slate-400 focus:outline-none focus:border-[#07834A] focus:ring-2 focus:ring-[#07834A]/15 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed shadow-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password? Row */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#D7E1ED] text-[#07834A] focus:ring-[#07834A]"
                />
                <span className="text-slate-600 font-medium">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSubmitted(false);
                  setShowForgotModal(true);
                }}
                className="text-[#2563eb] hover:text-[#1d4ed8] font-semibold hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Button: Sign In to ERP with Premium Green Gradient */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || isUnlocked}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#07834A] via-[#099956] to-[#10a35a] hover:from-[#067240] hover:to-[#0e8a4d] text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-800/25 hover:shadow-emerald-800/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-65 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : isUnlocked ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Access Granted · Entering ERP...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Sign In to ERP</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Simple Key-and-Lock Unlock Animation on Authenticated Access */}
          {isUnlocked && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-emerald-700 text-xs font-semibold animate-fadeIn">
              <svg className="w-5 h-5 text-emerald-600 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v2" />
              </svg>
              <span>Authenticating security token · Launching workspace...</span>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          FORGOT PASSWORD MODAL (Enterprise IT / Admin Dispatch)
         ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Forgot Password</h4>
                <p className="text-xs text-slate-500">Enterprise Security Password Reset</p>
              </div>
            </div>

            {forgotSubmitted ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-slate-900">Reset Request Dispatched</h5>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  A password reset ticket has been forwarded to the IT / HR Admin desk for <strong>{forgotEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-5 px-5 py-2 text-xs font-semibold text-white bg-[#07834A] hover:bg-[#067240] rounded-lg shadow"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  For internal manufacturing security, password changes are verified by your System Administrator. Enter your email or ID to generate a high-priority reset token.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Registered Email or Employee ID
                    </label>
                    <input
                      type="text"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. admin@nflbd.com"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (forgotEmail.trim()) {
                          setForgotSubmitted(true);
                        }
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg shadow"
                    >
                      Dispatch Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          FIRST-TIME ADMIN LOGIN: MANDATORY PASSWORD CHANGE MODAL (Section 12)
         ========================================================================= */}
      {showFirstTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">First-Time Administrator Setup</h4>
                <p className="text-xs text-slate-500">Security Requirement: Change Default Password</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              You are logging in with the initial temporary password (<strong>ChangeMe123!</strong>). To protect the ERP system and authorized factory records, please establish your permanent personal password now.
            </p>

            {passError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {passError}
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  New Secure Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#07834A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#07834A]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#07834A] to-[#16a34a] hover:from-[#067240] hover:to-[#0f8f4e] rounded-lg shadow"
                >
                  Save New Password & Enter ERP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
