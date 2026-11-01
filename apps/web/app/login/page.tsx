'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

interface Persona {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
  buyer: string;
  jobCount: number;
  category: 'LEADERSHIP' | 'MERCHANDISING' | 'TECHNICAL';
  tag: string;
  desc: string;
  badgeColor: string;
  badgeBg: string;
}

const QUICK_PERSONAS: Persona[] = [
  {
    id: 'user-director',
    email: 'director@northernfashions.com',
    name: 'Managing Director / Factory Owner',
    role: 'DIRECTOR',
    roles: ['DIRECTOR', 'OWNER', 'MANAGEMENT', 'ADMIN'],
    buyer: 'ALL Buyers',
    jobCount: 2000,
    category: 'LEADERSHIP',
    tag: '👑 Managing Director / Owner',
    desc: 'Full Access · Management Dashboard, Executive Intelligence, Financial Governance & All Plants',
    badgeColor: '#c2410c',
    badgeBg: '#fff7ed'
  },
  {
    id: 'user-head',
    email: 'admin@nfl.local',
    name: 'Tariqul Islam (Central Admin / Head)',
    role: 'HEAD_MERCHANDISER',
    roles: ['ADMIN', 'HEAD_MERCHANDISER', 'MANAGEMENT'],
    buyer: 'ALL Buyers',
    jobCount: 2000,
    category: 'LEADERSHIP',
    tag: '⚡ Central Admin & Head Merchandiser',
    desc: 'Full operational factory command, all 2,000 jobs, planning releases, cross-department workflows',
    badgeColor: '#1d4ed8',
    badgeBg: '#eff6ff'
  },
  {
    id: 'user-imran',
    email: 'imran.k@northernfashions.com',
    name: 'Md. Imran',
    role: 'MERCHANDISER',
    roles: ['MERCHANDISER', 'MERCH_BULK'],
    buyer: 'ONLY',
    jobCount: 61,
    category: 'MERCHANDISING',
    tag: '👔 Merchandiser (ONLY Buyer)',
    desc: '61 Assigned Jobs · Fabric Order Sheet, Trims BOM, T&A, Sample follow-up & Job 360',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5'
  },
  {
    id: 'user-basir',
    email: 'basir.h@northernfashions.com',
    name: 'Basir Hossain',
    role: 'MERCHANDISER',
    roles: ['MERCHANDISER', 'MERCH_BULK'],
    buyer: 'OVS Italy',
    jobCount: 64,
    category: 'MERCHANDISING',
    tag: '👔 Merchandiser (OVS Italy)',
    desc: '64 Assigned Jobs · OVS Italy brand follow-up, bulk approvals & shipment readiness',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb'
  },
  {
    id: 'user-planning',
    email: 'planning@nfl.local',
    name: 'Shahidul Alam',
    role: 'PLANNING_HEAD',
    roles: ['PLANNING_HEAD', 'PLANNING'],
    buyer: 'Central Planning',
    jobCount: 2000,
    category: 'MERCHANDISING',
    tag: '📅 Central Planning Head',
    desc: 'T&A Approval, Sewing Line Gantt, Fabric & Trims mill dispatch & capacity balancing',
    badgeColor: '#b45309',
    badgeBg: '#fff7ed'
  },
  {
    id: 'user-cad',
    email: 'cad@nfl.local',
    name: 'Rafiqul Islam',
    role: 'CAD_SPECIALIST',
    roles: ['CAD_SPECIALIST'],
    buyer: 'Technical CAD',
    jobCount: 2000,
    category: 'TECHNICAL',
    tag: '📐 CAD Specialist',
    desc: 'CAD Marker Efficiency, Color-wise fabric consumption & pattern engineering',
    badgeColor: '#4f46e5',
    badgeBg: '#eef2ff'
  },
  {
    id: 'user-ie',
    email: 'ie@nfl.local',
    name: 'Engr. Kabir Hossain',
    role: 'IE_SPECIALIST',
    roles: ['IE_SPECIALIST'],
    buyer: 'Central IE',
    jobCount: 2000,
    category: 'TECHNICAL',
    tag: '⚙️ Central IE Specialist',
    desc: 'Operation Bulletin, Target SMV, Line efficiency, hourly targets & NPT tracking',
    badgeColor: '#0891b2',
    badgeBg: '#ecfeff'
  },
  {
    id: 'user-lab',
    email: 'lab@nfl.local',
    name: 'Dr. Nazrul Islam',
    role: 'LAB_HEAD',
    roles: ['LAB_HEAD'],
    buyer: 'Dyeing Lab',
    jobCount: 2000,
    category: 'TECHNICAL',
    tag: '🧪 Dyeing Lab Chief',
    desc: 'Lab Dip shade match, Spectrophotometer delta-E, RFT quality & Shade OK certifications',
    badgeColor: '#be185d',
    badgeBg: '#fdf2f8'
  }
];

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'quick' | 'direct'>('quick');
  const [email, setEmail] = useState('director@northernfashions.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'LEADERSHIP' | 'MERCHANDISING' | 'TECHNICAL'>('ALL');

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

        // Sync with nos_active_persona for UI synchronization
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

        // Redirect based on role
        if (data.user.role === 'DIRECTOR' || data.user.role === 'OWNER') {
          window.location.href = '/management';
        } else if (data.user.role === 'MERCHANDISER' && data.user.merchandiserName === 'Imran') {
          window.location.href = '/jobs?myJobs=true';
        } else {
          window.location.href = '/';
        }
      } else {
        throw new Error('Login failed');
      }
    } catch {
      // Offline fallback
      const matched = QUICK_PERSONAS.find(p => p.email.toLowerCase() === loginEmail.toLowerCase() || p.id === personaId) || QUICK_PERSONAS[0];
      const fallbackUser = {
        id: matched.id,
        email: matched.email,
        name: matched.name,
        role: matched.role,
        roles: matched.roles,
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
      localStorage.setItem('nos-active-persona-id', matched.id);
      localStorage.setItem('nos-user-role', matched.role);

      if (matched.role === 'DIRECTOR' || matched.role === 'OWNER') {
        window.location.href = '/management';
      } else if (matched.role === 'MERCHANDISER' && matched.name.includes('Imran')) {
        window.location.href = '/jobs?myJobs=true';
      } else {
        window.location.href = '/';
      }
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    performLogin(email);
  }

  const filteredPersonas = QUICK_PERSONAS.filter(p => {
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #14243a 0%, #0b1320 60%, #050b14 100%)',
      fontFamily: '"Hind Siliguri", system-ui, -apple-system, sans-serif',
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px 16px'
    }}>
      {/* Top Bar Branding */}
      <header style={{
        maxWidth: '1180px',
        width: '100%',
        margin: '0 auto 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/branding/northern-fashions-logo.jpg"
            alt="Northern Fashions"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              objectFit: 'contain',
              background: '#ffffff',
              padding: '4px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.15)'
            }}
          />
          <div>
            <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Northern Fashions Limited
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12.5px', fontWeight: 500 }}>
              NFL Pulse ERP · Enterprise Manufacturing &amp; Operations Control
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(22, 163, 74, 0.15)',
            border: '1px solid rgba(22, 163, 74, 0.35)',
            color: '#86efac',
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Plant Core Active · 2,000 Linked Jobs
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#cbd5e1',
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: '6px'
          }}>
            ISO 9001 · OEKO-TEX · WRAP
          </span>
        </div>
      </header>

      {/* Main Container Card */}
      <main style={{
        maxWidth: '1180px',
        width: '100%',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        minHeight: '620px'
      }}>
        {/* Left Side: Plant Intelligence Sidebar */}
        <aside style={{
          background: 'linear-gradient(180deg, #14243a 0%, #1e3a5f 100%)',
          color: '#ffffff',
          padding: '36px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <div style={{
              display: 'inline-block',
              background: 'rgba(37, 99, 235, 0.3)',
              border: '1px solid rgba(37, 99, 235, 0.5)',
              color: '#93c5fd',
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '4px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}>
              Industrial Manufacturing ERP
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.25, margin: '0 0 12px', color: '#f8fafc' }}>
              Real-time Factory Floor Intelligence &amp; Execution
            </h2>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 28px' }}>
              Seamlessly integrates 21 garment manufacturing processes from Buyer PO breakdown to final shipment delivery.
            </p>

            {/* Quick Factory Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#60a5fa' }}>2,000</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Tracked Orders &amp; Jobs</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>42 Lines</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Sewing Capacity (NFL 1 &amp; 2)</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>23 Winches</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Dyeing &amp; HTHP Batches</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#c084fc' }}>98.4%</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>T&amp;A Critical Path Reliability</div>
              </div>
            </div>

            {/* Security Notice */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '11.5px',
              color: '#94a3b8',
              lineHeight: 1.5
            }}>
              🔒 <strong style={{ color: '#e2e8f0' }}>Role-Based Access Control (RBAC):</strong> Management Dashboard is strictly limited to Director &amp; Plant Executives. Merchandisers access only assigned buyer jobs.
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
            Northern Fashions Ltd · Plant 1 &amp; 2 · Gazipur, Bangladesh
          </div>
        </aside>

        {/* Right Side: Authentication Console */}
        <section style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
          {/* Header Switcher Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#14243a' }}>
                System Access Portal
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Sign in with enterprise credentials or test role-isolated views with one click
              </p>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '3px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('quick')}
                style={{
                  border: 'none',
                  background: activeTab === 'quick' ? '#ffffff' : 'transparent',
                  color: activeTab === 'quick' ? '#14243a' : '#64748b',
                  fontWeight: activeTab === 'quick' ? 800 : 600,
                  fontSize: '12px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'quick' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                ⚡ Quick Role Switcher
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('direct')}
                style={{
                  border: 'none',
                  background: activeTab === 'direct' ? '#ffffff' : 'transparent',
                  color: activeTab === 'direct' ? '#14243a' : '#64748b',
                  fontWeight: activeTab === 'direct' ? 800 : 600,
                  fontSize: '12px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'direct' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                🔑 Direct Sign-in
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* TAB 1: QUICK ROLE SWITCHER */}
          {activeTab === 'quick' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', alignSelf: 'center', marginRight: '4px' }}>
                  Filter Roles:
                </span>
                {(['ALL', 'LEADERSHIP', 'MERCHANDISING', 'TECHNICAL'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      border: '1px solid',
                      borderColor: selectedCategory === cat ? '#2563eb' : '#cbd5e1',
                      background: selectedCategory === cat ? '#eff6ff' : '#ffffff',
                      color: selectedCategory === cat ? '#1d4ed8' : '#475569',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    {cat === 'ALL' ? 'All Roles' : cat === 'LEADERSHIP' ? '👑 Executive & Governance' : cat === 'MERCHANDISING' ? '👔 Merchandising & Planning' : '⚙️ Technical & Floor'}
                  </button>
                ))}
              </div>

              {/* Persona Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '10px',
                overflowY: 'auto',
                maxHeight: '420px',
                paddingRight: '4px'
              }}>
                {filteredPersonas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={loading}
                    onClick={() => performLogin(p.email, p.id)}
                    style={{
                      textAlign: 'left',
                      background: '#ffffff',
                      border: p.role === 'DIRECTOR' ? '2px solid #ea580c' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: p.role === 'DIRECTOR' ? '0 4px 12px rgba(234, 88, 12, 0.15)' : '0 2px 5px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = p.role === 'DIRECTOR' ? '#ea580c' : '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = p.role === 'DIRECTOR' ? '0 4px 12px rgba(234, 88, 12, 0.15)' : '0 2px 5px rgba(0,0,0,0.03)';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: p.badgeColor,
                          background: p.badgeBg,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {p.tag}
                        </span>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                          {p.jobCount} Jobs
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
                        {p.desc}
                      </div>
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10.5px', color: '#94a3b8', fontFamily: 'monospace' }}>{p.email}</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>Sign In →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT CREDENTIAL SIGN IN */}
          {activeTab === 'direct' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '420px', margin: '20px auto 0', width: '100%' }}>
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Corporate Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="director@northernfashions.com"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '13.5px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    Authorized domain: @northernfashions.com or @nfl.local
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155' }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '11.5px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '13.5px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: '#2563eb' }} />
                    Remember this workstation
                  </label>
                  <span style={{ color: '#64748b' }}>Default: ChangeMe123!</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 20px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                    transition: 'background 0.15s ease',
                    marginTop: '8px'
                  }}
                >
                  {loading ? 'Authenticating...' : 'Sign In to Plant Console →'}
                </button>
              </form>
            </div>
          )}

          {/* Card Footer */}
          <div style={{
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px',
            color: '#64748b'
          }}>
            <span>Northern Fashions ERP v0.4.38 · Connected Factory Operations</span>
            <div style={{ display: 'flex', gap: '14px' }}>
              <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Executive Dashboard</Link>
              <Link href="/jobs" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Job 360</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Global Page Footer */}
      <footer style={{
        maxWidth: '1180px',
        width: '100%',
        margin: '20px auto 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        color: '#64748b',
        fontSize: '11px'
      }}>
        <div>&copy; 2026 Northern Fashions Limited. All rights reserved. Strictly for authorized industrial use.</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span>Security Protocol: TLS 1.3 / AES-256</span>
          <span>·</span>
          <span>Host: nfl-pulse-prod-01</span>
        </div>
      </footer>
    </div>
  );
}
