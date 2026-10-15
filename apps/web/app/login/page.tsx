'use client';

import { FormEvent, useState } from 'react';

const QUICK_PERSONAS = [
  {
    id: 'user-imran',
    email: 'imran.k@northernfashions.com',
    name: 'Md. Imran',
    role: 'MERCHANDISER',
    buyer: 'ONLY',
    jobCount: 61,
    tag: '⭐ Merchandiser (ONLY Buyer)',
    desc: '61 Assigned Jobs · Entry in Fabric Order Sheet, Trims BOM, T&A & Samples only',
    badgeColor: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0'
  },
  {
    id: 'user-head',
    email: 'admin@nfl.local',
    name: 'Tariqul Islam (Admin / Head)',
    role: 'HEAD_MERCHANDISER',
    buyer: 'ALL Buyers',
    jobCount: 2000,
    tag: '👑 Central Admin & Head Merchandiser',
    desc: 'Full Access across all 2,000 Factory Jobs, all lines, and all approval stages',
    badgeColor: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe'
  },
  {
    id: 'user-basir',
    email: 'basir.h@northernfashions.com',
    name: 'Basir Hossain',
    role: 'MERCHANDISER',
    buyer: 'OVS Italy',
    jobCount: 64,
    tag: 'Merchandiser (OVS Buyer)',
    desc: '64 Assigned Jobs · OVS Italy brand follow-up & approvals',
    badgeColor: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a'
  },
  {
    id: 'user-cad',
    email: 'cad@nfl.local',
    name: 'Rafiqul Islam',
    role: 'CAD_SPECIALIST',
    buyer: 'Technical CAD',
    jobCount: 2000,
    tag: '📐 CAD Specialist',
    desc: 'CAD Consumption, Marker Efficiency & Fabric Requirements entry',
    badgeColor: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe'
  },
  {
    id: 'user-ie',
    email: 'ie@nfl.local',
    name: 'Engr. Kabir Hossain',
    role: 'IE_SPECIALIST',
    buyer: 'Central IE',
    jobCount: 2000,
    tag: '⚙️ Central IE Specialist',
    desc: 'Operation Bulletin, Target SMV & Hourly targets entry',
    badgeColor: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc'
  },
  {
    id: 'user-lab',
    email: 'lab@nfl.local',
    name: 'Dr. Nazrul Islam',
    role: 'LAB_HEAD',
    buyer: 'Dyeing Lab',
    jobCount: 2000,
    tag: '🧪 Dyeing Lab Chief',
    desc: 'Lab Dip shade match & Shade OK certification',
    badgeColor: '#be185d',
    bg: '#fdf2f8',
    border: '#fbcfe8'
  },
  {
    id: 'user-planning',
    email: 'planning@nfl.local',
    name: 'Shahidul Alam',
    role: 'PLANNING_HEAD',
    buyer: 'Central Planning',
    jobCount: 2000,
    tag: '📅 Central Planning Head',
    desc: 'T&A Approval, Sewing Line Plans & Auto-dispatch to Knitting / Dyeing',
    badgeColor: '#b45309',
    bg: '#fff7ed',
    border: '#fed7aa'
  }
];

export default function LoginPage() {
  const [email, setEmail] = useState('imran.k@northernfashions.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function performLogin(loginEmail: string, personaId?: string) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, personaId })
      });
      const data = await res.json().catch(() => ({}));
      if (data?.user) {
        localStorage.setItem('nfl_access_token', data.accessToken || 'demo-access-token');
        localStorage.setItem('nfl_refresh_token', data.refreshToken || 'demo-refresh-token');
        localStorage.setItem('nfl_user', JSON.stringify(data.user));

        // Sync with nos_active_persona for Merchandising Control Tower
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

        // If Imran or single merchandiser, forward directly to his jobs view!
        if (data.user.role === 'MERCHANDISER' && data.user.merchandiserName === 'Imran') {
          window.location.href = '/jobs?myJobs=true';
        } else {
          window.location.href = '/';
        }
      } else {
        throw new Error('Login failed');
      }
    } catch {
      // Offline fallback for demo
      const matched = QUICK_PERSONAS.find(p => p.email.toLowerCase() === loginEmail.toLowerCase() || p.id === personaId) || QUICK_PERSONAS[0];
      const fallbackUser = {
        id: matched.id,
        email: matched.email,
        name: matched.name,
        role: matched.role,
        roles: [matched.role, 'MERCH_BULK'],
        merchandiserName: matched.role === 'MERCHANDISER' ? (matched.name.includes('Imran') ? 'Imran' : matched.name.split(' ')[0]) : 'ALL',
        assignedBuyer: matched.buyer,
        department: matched.desc
      };
      localStorage.setItem('nfl_access_token', 'demo-access-token');
      localStorage.setItem('nfl_refresh_token', 'demo-refresh-token');
      localStorage.setItem('nfl_user', JSON.stringify(fallbackUser));
      localStorage.setItem('nos_active_persona', JSON.stringify({
        id: matched.id,
        name: matched.name,
        role: matched.role,
        assignedBuyer: matched.buyer,
        email: matched.email,
        avatar: matched.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
        department: matched.desc
      }));
      window.location.href = (matched.role === 'MERCHANDISER' && matched.name.includes('Imran')) ? '/jobs?myJobs=true' : '/';
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    performLogin(email);
  }

  return (
    <div className="login-wrap" style={{ minHeight: '100vh', padding: '30px 15px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '820px', width: '100%', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        
        {/* Header Banner */}
        <div style={{ background: '#0f172a', color: '#ffffff', padding: '24px 30px', borderBottom: '3px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/branding/northern-fashions-logo.jpg" alt="Northern Fashions" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain', background: '#fff', padding: '3px' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', color: '#f8fafc' }}>Northern Fashions Limited</h1>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>NFL Pulse ERP v0.4.35 · Role-Based Operational Security</div>
            </div>
          </div>
          <span style={{ fontSize: '11px', background: '#1e3a8a', color: '#93c5fd', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
            AUTHENTICATED ACCESS
          </span>
        </div>

        <div style={{ padding: '28px 30px' }}>
          
          {/* Quick Persona Selection Box */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: 900 }}>
                ⚡ Quick Role Sign-in (এক ক্লিকে প্রবেশ করুন)
              </strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Select any profile to test job isolation & entry limits</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {QUICK_PERSONAS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  disabled={loading}
                  onClick={() => performLogin(p.email, p.id)}
                  style={{
                    textAlign: 'left',
                    background: p.bg,
                    border: `1.5px solid ${p.border}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 900, color: p.badgeColor }}>
                      {p.tag}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, background: '#fff', color: '#334155', padding: '1px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      {p.jobCount} Jobs
                    </span>
                  </div>
                  <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block' }}>{p.name}</strong>
                  <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '3px', lineHeight: 1.35 }}>
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>OR SIGN IN WITH CREDENTIALS</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Regular Login Form */}
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Email Address</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. imran.k@northernfashions.com"
                style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '7px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '7px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ gridColumn: 'span 2', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: 700 }}>
                {error}
              </div>
            )}

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 800, borderRadius: '7px', cursor: 'pointer' }}
              >
                {loading ? 'Authenticating...' : 'Sign In as Selected User →'}
              </button>
            </div>
          </form>

        </div>

        {/* Footer Note */}
        <div style={{ background: '#f8fafc', padding: '12px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
          <span>Northern Fashions ERP · Connected Floor Operations</span>
          <span>Role Isolation Active: Imran (ONLY Buyer) · Central IE · CAD · Lab · Planning</span>
        </div>
      </div>
    </div>
  );
}
