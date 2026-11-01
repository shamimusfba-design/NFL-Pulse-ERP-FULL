'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastActive: string;
  twoFactorEnabled: boolean;
  permissions: string[];
}

const INITIAL_USERS: SystemUser[] = [
  {
    id: 'USR-001',
    name: 'Managing Director / Factory Owner',
    email: 'admin@nflbd.com',
    role: 'Super Administrator',
    department: 'Management',
    status: 'ACTIVE',
    lastActive: 'Just now',
    twoFactorEnabled: true,
    permissions: ['ALL_PERMISSIONS', 'DIRECTOR_OVERRIDE', 'PRICE_UNMASK', 'AUDIT_LOGS']
  },
  {
    id: 'USR-002',
    name: 'Shamim Hossain (General Manager)',
    email: 'gm@nflbd.com',
    role: 'Executive Director',
    department: 'Management',
    status: 'ACTIVE',
    lastActive: '12 mins ago',
    twoFactorEnabled: true,
    permissions: ['VIEW_ALL', 'APPROVE_QUOTAS', 'GATE_PASS_OVERRIDE', 'MANAGEMENT_DASHBOARD']
  },
  {
    id: 'USR-003',
    name: 'Ayub Ali (Merchandising Team 1)',
    email: 'ayub.merch@nflbd.com',
    role: 'Senior Merchandiser',
    department: 'Sales & Merchandising',
    status: 'ACTIVE',
    lastActive: '35 mins ago',
    twoFactorEnabled: false,
    permissions: ['ORDER_ENTRY', 'TNA_EDIT', 'SAMPLE_REQUISITION', 'BUYER_QUOTA_VIEW']
  },
  {
    id: 'USR-004',
    name: 'Dr. Nazrul Islam (Chief Chemist)',
    email: 'lab.head@nflbd.com',
    role: 'Laboratory In-Charge',
    department: 'Dyeing Lab & Testing Lab',
    status: 'ACTIVE',
    lastActive: '1 hour ago',
    twoFactorEnabled: true,
    permissions: ['DYEING_LAB_APPROVE', 'TESTING_GATE_CLEAR', 'COA_SIGN', 'RE_DIP_ORDER']
  },
  {
    id: 'USR-005',
    name: 'Kabir Ahmed (Quality Head)',
    email: 'qa.manager@nflbd.com',
    role: 'Quality Assurance Manager',
    department: 'Fabric & Garments Quality',
    status: 'ACTIVE',
    lastActive: '2 hours ago',
    twoFactorEnabled: true,
    permissions: ['FABRIC_HOLD_RELEASE', 'GARMENT_AQL_AUDIT', 'DHU_LOGGING', 'DEFECT_LIBRARY']
  },
  {
    id: 'USR-006',
    name: 'M. Ali (Dyeing GM)',
    email: 'dyeing.head@nflbd.com',
    role: 'Dyeing Production Manager',
    department: 'Dyeing',
    status: 'ACTIVE',
    lastActive: '3 hours ago',
    twoFactorEnabled: false,
    permissions: ['VESSEL_SCHEDULING', 'RFT_APPROVAL', 'REPROCESS_AUTHORIZE', 'CHEMICAL_STORE']
  },
  {
    id: 'USR-007',
    name: 'Tariqul Islam (Store Manager)',
    email: 'store.fab@nflbd.com',
    role: 'Store In-Charge',
    department: 'Finished Fabric Store',
    status: 'ACTIVE',
    lastActive: '4 hours ago',
    twoFactorEnabled: false,
    permissions: ['ROLL_RECEIVE', 'BIN_ALLOCATION', 'CUTTING_ISSUE_EXECUTE']
  }
];

export default function AdminAccessPage() {
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'AUDIT'>('USERS');
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell
      title="Admin Access Control"
      eyebrow="Security, Role-Based Access Control (RBAC), Permissions & Enterprise Audit Logs"
    >
      {/* Header */}
      <section className="module-hero" style={{ marginBottom: 16 }}>
        <div>
          <span className="status-pill" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            System Security &amp; Identity Management
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            Enterprise Role &amp; Access Governance
          </h2>
          <p style={{ fontSize: 13.5, color: '#475569', maxWidth: 880 }}>
            Configure and govern user credentials, departmental roles, quality clearance authorization keys, and executive overrides across all 26 plant operational workspaces.
          </p>
        </div>
      </section>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #2563EB', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#64748B', textTransform: 'uppercase' }}>Configured Users</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{users.length} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>active accounts</span></div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Plant-wide personnel</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #16A34A', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#166534', textTransform: 'uppercase' }}>2FA Enforced</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#15803D', marginTop: 4 }}>5 <span style={{ fontSize: 13, fontWeight: 600 }}>users (71%)</span></div>
          <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Biometric &amp; TOTP keys</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #0EA5E9', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#0369A1', textTransform: 'uppercase' }}>Departments Governed</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0369A1', marginTop: 4 }}>26 <span style={{ fontSize: 13, fontWeight: 600 }}>workspaces</span></div>
          <div style={{ fontSize: 12, color: '#0369A1', marginTop: 2 }}>Zero unauthorized cross-access</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderLeft: '4px solid #8B5CF6', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 750, color: '#6D28D9', textTransform: 'uppercase' }}>Audit Events Logged</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#6D28D9', marginTop: 4 }}>1,482 <span style={{ fontSize: 13, fontWeight: 600 }}>today</span></div>
          <div style={{ fontSize: 12, color: '#6D28D9', marginTop: 2 }}>Immutable security trace</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: activeTab === 'USERS' ? '1px solid #0F274E' : '1px solid #CBD5E1',
            background: activeTab === 'USERS' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'USERS' ? '#FFFFFF' : '#334155',
            fontWeight: 750,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          User Accounts &amp; Roles
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ROLES')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: activeTab === 'ROLES' ? '1px solid #0F274E' : '1px solid #CBD5E1',
            background: activeTab === 'ROLES' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'ROLES' ? '#FFFFFF' : '#334155',
            fontWeight: 750,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          Permission Matrix (26 Departments)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: activeTab === 'AUDIT' ? '1px solid #0F274E' : '1px solid #CBD5E1',
            background: activeTab === 'AUDIT' ? '#0F274E' : '#F8FAFC',
            color: activeTab === 'AUDIT' ? '#FFFFFF' : '#334155',
            fontWeight: 750,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          Security Audit Trail
        </button>
      </div>

      {activeTab === 'USERS' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 14.5, color: '#0F172A' }}>Active Staff Access Register</strong>
            <input
              type="text"
              placeholder="Search user, role, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid #CBD5E1', width: 240 }}
            />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead style={{ background: '#F1F5F9' }}>
              <tr style={{ borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>User Name &amp; ID</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Role</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Department</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>2FA</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Last Login</th>
                <th style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <strong style={{ color: '#0F274E' }}>{u.name}</strong>
                    <span style={{ display: 'block', fontSize: 11.5, color: '#64748B' }}>{u.email}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1E293B' }}>{u.role}</td>
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{u.department}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 750 }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {u.twoFactorEnabled ? (
                      <span style={{ color: '#15803D', fontWeight: 750, fontSize: 12 }}>✓ Enforced</span>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: 12 }}>Disabled</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748B' }}>{u.lastActive}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      type="button"
                      style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 4, border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer' }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ROLES' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
            Departmental Role &amp; Clearance Authority Matrix
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
            Defines write permissions and gate clearance authority across the complete 26-department ERP workflow.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {[
              { title: 'Factory Director / Owner', can: ['View all commercial profits & margins', 'Override Quality Holds', 'Access Executive & Management Dashboards', 'Manage User Roles'] },
              { title: 'Merchandising Team', can: ['Create Orders & Style Numbers', 'Update T&A milestones', 'Approve Fabric Requisitions', 'Review Lab Dips & Fit comments'] },
              { title: 'Dyeing & Testing Lab In-Charge', can: ['Formulate & approve Lab Dips (A/B/C/D)', 'Issue Fabric Test Certificates', 'Unlock Delivery Gate for Finished Fabric Store', 'Mandate Dyeing Reprocess / Retests'] },
              { title: 'Quality Assurance Head', can: ['Authorize 4-Point Fabric Inspection', 'Block Defective Fabric Rolls', 'Perform Final AQL 1.5/2.5 Carton Audits', 'Release Quality Holds'] },
              { title: 'Store In-Charge (Finished Fabric)', can: ['Receive Approved Fabric Rolls', 'Assign Godown Bin locations', 'Issue fabric to Cutting (ONLY if Test & Quality are PASS)'] }
            ].map((role, idx) => (
              <div key={idx} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14 }}>
                <strong style={{ fontSize: 14, color: '#0F274E', display: 'block', marginBottom: 8 }}>{role.title}</strong>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {role.can.map((c, ci) => (
                    <li key={ci}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
            Real-Time Enterprise Security Audit Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            {[
              { time: '10:48 AM', user: 'admin@nflbd.com', event: 'Super Admin Login successful from 192.168.1.10 (Gazipur Head Office)', severity: 'INFO' },
              { time: '10:35 AM', user: 'lab.head@nflbd.com', event: 'Delivery Gate CLEARED for Batch #B-48085-01 (All Physical & Wash Fastness Passed)', severity: 'SUCCESS' },
              { time: '09:50 AM', user: 'qa.manager@nflbd.com', event: 'Quality Hold placed on Batch #B-48002-02 (Wet Rubbing Fastness Fail - Grade 2.5)', severity: 'WARNING' },
              { time: '09:12 AM', user: 'gm@nflbd.com', event: 'Monthly Export Target updated to 18,00,000 pcs for Maurices & Sainsbury accounts', severity: 'INFO' }
            ].map((log, li) => (
              <div key={li} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 650 }}>{log.time}</span>
                  <span style={{ fontWeight: 700, color: '#0F274E' }}>{log.user}</span>
                  <span style={{ color: '#334155' }}>— {log.event}</span>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: log.severity === 'SUCCESS' ? '#DCFCE7' : log.severity === 'WARNING' ? '#FEE2E2' : '#EFF6FF',
                  color: log.severity === 'SUCCESS' ? '#15803D' : log.severity === 'WARNING' ? '#B91C1C' : '#1D4ED8'
                }}>
                  {log.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
