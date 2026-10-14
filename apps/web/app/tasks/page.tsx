'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import { api } from '../../lib/api';
import { buyerShortCode, displayJobNo } from '../../lib/display';

function TasksContent() {
  const searchParams = useSearchParams();
  const initialJobNo = searchParams.get('jobNo') || '';

  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [query, setQuery] = useState(initialJobNo);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const loadTasks = () => {
    api('/tasks/my')
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(tasks.map((t) => String(t.department || '')).filter(Boolean))).sort(),
    [tasks]
  );
  const modules = useMemo(
    () => Array.from(new Set(tasks.map((t) => String(t.module || '')).filter(Boolean))).sort(),
    [tasks]
  );
  const priorities = useMemo(
    () => Array.from(new Set(tasks.map((t) => String(t.priority || '')).filter(Boolean))).sort(),
    [tasks]
  );

  const rows = useMemo(() => {
    return tasks.filter((t) => {
      if (moduleFilter !== 'ALL' && String(t.module) !== moduleFilter) return false;
      if (departmentFilter !== 'ALL' && String(t.department || '') !== departmentFilter) return false;
      if (priorityFilter !== 'ALL' && String(t.priority) !== priorityFilter) return false;
      if (statusFilter !== 'ALL' && String(t.status) !== statusFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const jobStr = String(t.jobNo || t.order?.jobNo || '');
      const searchTarget = `${t.title} ${t.module} ${t.department || ''} ${jobStr} ${displayJobNo(t.order?.jobNo, t.order?.buyer)} ${buyerShortCode(t.order?.buyer?.code || t.order?.buyer?.name)}`.toLowerCase();
      return searchTarget.includes(q);
    });
  }, [tasks, moduleFilter, departmentFilter, priorityFilter, statusFilter, query]);

  const handleTaskStatus = async (task: any, nextStatus: string) => {
    setBusyTaskId(task.id);
    setSuccessMsg('');
    try {
      await api('/tasks/update', {
        method: 'POST',
        body: JSON.stringify({
          taskId: task.id,
          status: nextStatus
        })
      });
      setSuccessMsg(`✓ Task "${task.title}" updated to ${nextStatus.replace('_', ' ')}.`);
      loadTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <Shell title="Department Task Engine" eyebrow="Operational Workflows · Central IE, CAD, Merchandising & Planning">
      <div className="card" style={{ padding: '20px' }}>
        {error && <div className="notice" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}
        {successMsg && <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', fontWeight: 700 }}>{successMsg}</div>}

        {/* Header & Quick Filter bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Active Workflow Tasks</h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0' }}>
              Tasks generated on PO import across Central IE, CAD, Merchandising, Dyeing Lab, and Central Planning.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/merchandising/order-po" className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none' }}>
              + Import Another PO
            </Link>
            <Link href="/jobs?tab=preproduction" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none' }}>
              ⚡ Pre-Production Stage Control
            </Link>
          </div>
        </div>

        <div className="section-filter-bar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label className="filter-grow" style={{ minWidth: '220px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>Search Task / Job #</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 48093, IE Bulletin, CAD, Shade..."
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
            />
          </label>
          <label>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>Department</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>Module</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Modules</option>
              {modules.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Priorities</option>
              {priorities.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569' }}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="WAITING">WAITING / BLOCKED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </label>
        </div>

        <div className="table-scroll">
          <table className="table compact-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px 12px' }}>Job No</th>
                <th style={{ padding: '10px 12px' }}>Department</th>
                <th style={{ padding: '10px 12px' }}>Task Title & Workflow Objective</th>
                <th style={{ padding: '10px 12px' }}>Module</th>
                <th style={{ padding: '10px 12px' }}>Priority</th>
                <th style={{ padding: '10px 12px' }}>Due Date / Next Action</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const jobNum = t.jobNo || t.order?.jobNo;
                const isCompleted = t.status === 'COMPLETED';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0', background: isCompleted ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '10px 12px' }}>
                      {jobNum ? (
                        <Link
                          href={`/jobs/${jobNum}`}
                          style={{
                            fontWeight: 900,
                            color: '#2563eb',
                            textDecoration: 'none',
                            background: '#eff6ff',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #bfdbfe',
                            fontSize: '12.5px'
                          }}
                        >
                          #{jobNum}
                        </Link>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {t.order?.buyer?.name || t.order?.buyer?.code || ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#334155', fontSize: '12.5px' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
                        {t.department || (t.module === 'cad' ? 'CAD Section' : t.module === 'ie-bulletin' ? 'Central IE' : t.module === 'lab' ? 'Dyeing Lab' : t.module === 'sewing-planning' ? 'Central Planning' : 'Merchandising')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{t.title}</strong>
                      {t.description && (
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px', maxWidth: '420px', lineHeight: 1.4 }}>
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>
                      <Link href={`/modules/${t.module}`} style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 600 }}>
                        {t.module} ↗
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        className="badge"
                        style={{
                          background: t.priority === 'CRITICAL' ? '#fee2e2' : t.priority === 'HIGH' ? '#ffedd5' : '#f1f5f9',
                          color: t.priority === 'CRITICAL' ? '#991b1b' : t.priority === 'HIGH' ? '#9a3412' : '#475569',
                          fontWeight: 800,
                          fontSize: '10.5px'
                        }}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', minWidth: '180px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>{t.dueAt || 'No due date set'}</div>
                      {t.nextAction && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', maxWidth: '260px', lineHeight: 1.4 }}>{t.nextAction}</div>}
                      {t.waitingOn && <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>Waiting on: {t.waitingOn}</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          color: isCompleted ? '#059669' : t.status === 'IN_PROGRESS' ? '#d97706' : '#64748b',
                          background: isCompleted ? '#ecfdf5' : t.status === 'IN_PROGRESS' ? '#fef3c7' : '#f8fafc',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          border: `1px solid ${isCompleted ? '#a7f3d0' : '#e2e8f0'}`
                        }}
                      >
                        {isCompleted ? '✓ COMPLETED' : t.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {jobNum && (
                          <Link
                            href={`/jobs/${jobNum}`}
                            className="btn btn-secondary"
                            style={{ fontSize: '11px', padding: '4px 8px', textDecoration: 'none' }}
                          >
                            Job Details
                          </Link>
                        )}
                        {!isCompleted && (
                          <button
                            onClick={() => handleTaskStatus(t, 'COMPLETED')}
                            disabled={busyTaskId === t.id}
                            style={{
                              background: '#059669',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            {busyTaskId === t.id ? 'Saving...' : '✓ Complete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && !error && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            No pending tasks found for this filter.
          </div>
        )}
      </div>
    </Shell>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<Shell title="My Pending Tasks"><div style={{ padding: '20px' }}>Loading tasks...</div></Shell>}>
      <TasksContent />
    </Suspense>
  );
}
