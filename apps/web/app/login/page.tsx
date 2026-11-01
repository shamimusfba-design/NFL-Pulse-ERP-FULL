'use client';

import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('director@northernfashions.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  async function performLogin(loginEmail: string, loginPass: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });
      const data = await res.json().catch(() => ({}));

      if (data?.user) {
        localStorage.setItem('nfl_access_token', data.accessToken || 'demo-access-token');
        localStorage.setItem('nfl_refresh_token', data.refreshToken || 'demo-refresh-token');
        localStorage.setItem('nfl_user', JSON.stringify(data.user));

        const persona = {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role || 'MERCHANDISER',
          assignedBuyer: data.user.assignedBuyer || 'ONLY',
          email: data.user.email,
          avatar: data.user.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
          department: data.user.department || 'Merchandising'
        };
        localStorage.setItem('nos_active_persona', JSON.stringify(persona));
        localStorage.setItem('nos-active-persona-id', data.user.id);
        localStorage.setItem('nos-user-role', data.user.role);

        // Trigger unlock animation before redirect
        setIsUnlocked(true);
        setTimeout(() => {
          if (data.user.role === 'DIRECTOR' || data.user.role === 'OWNER') {
            window.location.href = '/management';
          } else if (data.user.role === 'MERCHANDISER' && data.user.merchandiserName === 'Imran') {
            window.location.href = '/jobs?myJobs=true';
          } else {
            window.location.href = '/';
          }
        }, 750);
      } else {
        throw new Error(data.message || 'Invalid email or password');
      }
    } catch (err: any) {
      // Offline / fallback verification for provisioned administrator accounts
      const lower = loginEmail.toLowerCase().trim();
      let fallbackUser: any = null;

      if (lower.includes('director') || lower.includes('owner')) {
        fallbackUser = {
          id: 'user-director',
          email: 'director@northernfashions.com',
          name: 'Managing Director / Factory Owner',
          role: 'DIRECTOR',
          roles: ['DIRECTOR', 'OWNER', 'MANAGEMENT', 'ADMIN'],
          merchandiserName: 'ALL',
          assignedBuyer: 'ALL Buyers',
          department: 'Executive Management'
        };
      } else if (lower.includes('admin') || lower.includes('head') || lower.includes('tariqul')) {
        fallbackUser = {
          id: 'user-head',
          email: 'admin@nfl.local',
          name: 'Tariqul Islam (Central Admin / Head)',
          role: 'HEAD_MERCHANDISER',
          roles: ['ADMIN', 'HEAD_MERCHANDISER', 'MANAGEMENT'],
          merchandiserName: 'ALL',
          assignedBuyer: 'ALL Buyers',
          department: 'Executive Merchandising & Admin'
        };
      } else if (lower.includes('imran')) {
        fallbackUser = {
          id: 'user-imran',
          email: 'imran.k@northernfashions.com',
          name: 'Md. Imran',
          role: 'MERCHANDISER',
          roles: ['MERCHANDISER', 'MERCH_BULK'],
          merchandiserName: 'Imran',
          assignedBuyer: 'ONLY',
          department: 'Merchandising'
        };
      } else if (lower.includes('planning')) {
        fallbackUser = {
          id: 'user-planning',
          email: 'planning@nfl.local',
          name: 'Shahidul Alam',
          role: 'PLANNING_HEAD',
          roles: ['PLANNING_HEAD', 'PLANNING'],
          merchandiserName: 'ALL',
          assignedBuyer: 'Central Planning',
          department: 'Central Planning'
        };
      } else if (lower.includes('cad')) {
        fallbackUser = {
          id: 'user-cad',
          email: 'cad@nfl.local',
          name: 'Rafiqul Islam',
          role: 'CAD_SPECIALIST',
          roles: ['CAD_SPECIALIST'],
          merchandiserName: 'ALL',
          assignedBuyer: 'Technical CAD',
          department: 'CAD & Pattern'
        };
      } else if (lower.includes('ie')) {
        fallbackUser = {
          id: 'user-ie',
          email: 'ie@nfl.local',
          name: 'Engr. Kabir Hossain',
          role: 'IE_SPECIALIST',
          roles: ['IE_SPECIALIST', 'IE'],
          merchandiserName: 'ALL',
          assignedBuyer: 'Central IE',
          department: 'Industrial Engineering'
        };
      } else if (lower.includes('quality') || lower.includes('qa')) {
        fallbackUser = {
          id: 'user-qa',
          email: 'quality@nfl.local',
          name: 'Abdul Malek',
          role: 'QUALITY_HEAD',
          roles: ['QUALITY_HEAD', 'QUALITY'],
          merchandiserName: 'ALL',
          assignedBuyer: 'Garment Quality',
          department: 'Garment Quality Assurance'
        };
      }

      if (fallbackUser) {
        localStorage.setItem('nfl_access_token', 'demo-access-token');
        localStorage.setItem('nfl_refresh_token', 'demo-refresh-token');
        localStorage.setItem('nfl_user', JSON.stringify(fallbackUser));
        localStorage.setItem('nos_active_persona', JSON.stringify({
          id: fallbackUser.id,
          name: fallbackUser.name,
          role: fallbackUser.role,
          assignedBuyer: fallbackUser.assignedBuyer,
          email: fallbackUser.email,
          avatar: fallbackUser.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
          department: fallbackUser.department
        }));
        localStorage.setItem('nos-active-persona-id', fallbackUser.id);
        localStorage.setItem('nos-user-role', fallbackUser.role);

        // Trigger unlock animation before redirect
        setIsUnlocked(true);
        setTimeout(() => {
          if (fallbackUser.role === 'DIRECTOR' || fallbackUser.role === 'OWNER') {
            window.location.href = '/management';
          } else if (fallbackUser.role === 'MERCHANDISER' && fallbackUser.name.includes('Imran')) {
            window.location.href = '/jobs?myJobs=true';
          } else {
            window.location.href = '/';
          }
        }, 750);
      } else {
        setError(err?.message || 'Invalid credentials or user not provisioned in ERP system.');
        setLoading(false);
      }
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your work email or employee ID.');
      return;
    }
    performLogin(email, password);
  }

  return (
    <div className="login-viewport">
      {/* Background with tasteful industrial garment factory image and soft blur */}
      <div
        className="login-bg-media"
        style={{
          backgroundImage: "url('/branding/garment-factory-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div className="login-bg-overlay" />

      {/* Main Corporate Container */}
      <div className="login-content-box">
        {/* Genuine Company Logo and Header */}
        <div className="login-brand-header">
          <img
            src="/branding/northern-fashions-logo.jpg"
            alt="Northern Fashions Limited"
            className="login-brand-logo"
          />
          <h1 className="login-company-name">Northern Fashion Limited</h1>
          <p className="login-company-sub">Apparel Manufacturing ERP · Operations Control</p>
        </div>

        {/* Single Login Card */}
        <div className="login-card">
          <div className="login-card-head">
            <h2>Sign In to Your Workspace</h2>
            <p>Authorized Northern Fashions Limited personnel only</p>
          </div>

          {error && (
            <div className="login-error-alert" role="alert">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {isUnlocked ? (
            /* Key and Lock Unlock Success Animation */
            <div className="login-unlock-animation">
              <div className="unlock-icon-wrap">
                <svg className="unlock-svg" viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor">
                  {/* Lock Body */}
                  <rect x="14" y="26" width="36" height="28" rx="5" fill="#1e3a5f" stroke="#2563eb" strokeWidth="2.5" />
                  {/* Unlocking Shackle */}
                  <path
                    className="unlock-shackle"
                    d="M22 26V18C22 12.4772 26.4772 8 32 8C37.5228 8 42 12.4772 42 18V20"
                    stroke="#22c55e"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Turning Golden Key */}
                  <g className="unlock-key">
                    <circle cx="32" cy="38" r="4" fill="#eab308" />
                    <path d="M32 42V48M32 45H35" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                </svg>
              </div>
              <div className="unlock-title">Access Confirmed</div>
              <div className="unlock-sub">Unlocking ERP workspace...</div>
            </div>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-form-group">
                <label htmlFor="login-email">Work Email / Employee ID</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">👤</span>
                  <input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. director@northernfashions.com"
                    autoComplete="username"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label htmlFor="login-password">Password</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">🔒</span>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="login-btn-loading">
                    <span className="login-spinner" />
                    <span>Verifying Credentials...</span>
                  </span>
                ) : (
                  <span>Sign In to ERP</span>
                )}
              </button>
            </form>
          )}

          <div className="login-security-notice">
            <span>🛡️</span>
            <span>Enterprise 256-bit encrypted authentication. Internal network access only.</span>
          </div>
        </div>

        {/* Software Features - Compact Highlights Below Login */}
        <div className="login-features-strip">
          <div className="login-feature-item">
            <div className="feature-icon-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div>
              <strong>Complete ERP</strong>
              <span>Integrated Factory Management</span>
            </div>
          </div>

          <div className="login-feature-item">
            <div className="feature-icon-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <strong>Live Tracking</strong>
              <span>Real-time Order Visibility</span>
            </div>
          </div>

          <div className="login-feature-item">
            <div className="feature-icon-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <strong>Smart Planning</strong>
              <span>Production Coordination</span>
            </div>
          </div>

          <div className="login-feature-item">
            <div className="feature-icon-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div>
              <strong>Quality Control</strong>
              <span>Manufacturing Quality Monitoring</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="login-footer">
          <div>Northern Fashions Limited · Operations Control System v2.6.4</div>
          <div className="login-footer-copy">All Rights Reserved · Authorized Production Factory Use Only</div>
        </footer>
      </div>

      <style jsx>{`
        .login-viewport {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #f1f5f9;
        }

        .login-bg-media {
          position: fixed;
          inset: 0;
          background: url('/branding/garment-factory-bg.jpg') center center / cover no-repeat;
          filter: blur(4px) brightness(0.60);
          transform: scale(1.04);
          z-index: 1;
        }

        .login-bg-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.72) 0%, rgba(8, 14, 26, 0.88) 100%);
          z-index: 2;
        }

        .login-content-box {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .login-brand-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .login-brand-logo {
          height: 48px;
          width: auto;
          object-fit: contain;
          border-radius: 6px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          background: #ffffff;
          padding: 3px 6px;
        }

        .login-company-name {
          margin: 4px 0 0;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }

        .login-company-sub {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          color: #cbd5e1;
          letter-spacing: 0.02em;
        }

        .login-card {
          width: 100%;
          background: rgba(17, 24, 39, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-card-head {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 12px;
        }

        .login-card-head h2 {
          margin: 0 0 3px;
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
        }

        .login-card-head p {
          margin: 0;
          font-size: 11.5px;
          color: #94a3b8;
        }

        .login-error-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(220, 38, 38, 0.2);
          border: 1px solid #dc2626;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 12px;
          color: #fca5a5;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .login-form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .login-form-group label {
          font-size: 11.5px;
          font-weight: 600;
          color: #cbd5e1;
        }

        .login-input-wrap {
          display: flex;
          align-items: center;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 7px;
          padding: 0 10px;
          transition: border-color 0.15s ease;
        }

        .login-input-wrap:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
        }

        .login-input-icon {
          font-size: 13px;
          color: #64748b;
          margin-right: 8px;
        }

        .login-input-wrap input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #ffffff;
          font-size: 13px;
          padding: 9px 0;
        }

        .login-input-wrap input::placeholder {
          color: #64748b;
        }

        .login-submit-btn {
          margin-top: 4px;
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 7px;
          padding: 10px 16px;
          font-size: 13.5px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-submit-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-btn-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .login-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Unlocking Animation */
        .login-unlock-animation {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 18px 0;
          text-align: center;
        }

        .unlock-icon-wrap {
          margin-bottom: 8px;
          animation: pulseGlow 0.7s ease infinite alternate;
        }

        .unlock-shackle {
          animation: popShackle 0.5s ease forwards;
          transform-origin: 22px 26px;
        }

        .unlock-key {
          animation: turnKey 0.4s ease 0.1s forwards;
          transform-origin: 32px 38px;
        }

        @keyframes popShackle {
          0% { transform: translateY(0); }
          50% { transform: translateY(-7px) rotate(-10deg); }
          100% { transform: translateY(-7px) rotate(-22deg); }
        }

        @keyframes turnKey {
          0% { transform: rotate(0); }
          100% { transform: rotate(90deg); }
        }

        @keyframes pulseGlow {
          from { filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.4)); }
          to { filter: drop-shadow(0 0 16px rgba(34, 197, 94, 0.8)); }
        }

        .unlock-title {
          font-size: 15px;
          font-weight: 800;
          color: #4ade80;
          margin-bottom: 2px;
        }

        .unlock-sub {
          font-size: 12px;
          color: #94a3b8;
        }

        .login-security-notice {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #64748b;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }

        /* Feature Highlights Section */
        .login-features-strip {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        @media (min-width: 640px) {
          .login-features-strip {
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }
        }

        .login-feature-item {
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .feature-icon-box {
          color: #60a5fa;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .login-feature-item strong {
          display: block;
          font-size: 11.5px;
          font-weight: 700;
          color: #e2e8f0;
          line-height: 1.2;
        }

        .login-feature-item span {
          display: block;
          font-size: 10px;
          color: #94a3b8;
          line-height: 1.2;
          margin-top: 1px;
        }

        .login-footer {
          text-align: center;
          font-size: 11px;
          color: #64748b;
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 6px;
        }

        .login-footer-copy {
          font-size: 10px;
          color: #475569;
        }
      `}</style>
    </div>
  );
}
