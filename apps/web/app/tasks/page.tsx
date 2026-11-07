'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Shell from '../../components/Shell';
import { Badge, DataGrid, GridColumn, RecordPanel, RecordSection } from '../../components/ui';
import { api } from '../../lib/api';
import { buyerShortCode, displayJobNo } from '../../lib/display';
import { fmtDate, fmtNum } from '../../lib/format';

interface WorkflowTaskRow {
  id: string;
  jobNo?: string;
  title: string;
  description?: string;
  module: string;
  department?: string;
  priority: string;
  status: string;
  dueDate?: string;
  order?: {
    jobNo?: string;
    buyer?: {
      code?: string;
      name?: string;
    };
  };
}

function resolveTaskDepartment(t: WorkflowTaskRow): string {
  return (
    t.department ||
    (t.module === 'cad'
      ? 'CAD Section'
      : t.module === 'ie-bulletin'
      ? 'Central IE'
      : t.module === 'lab'
      ? 'Dyeing Lab'
      : t.module === 'sewing-planning'
      ? 'Central Planning'
      : 'Merchandising')
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const initialJobNo = searchParams.get('jobNo') || '';

  const [tasks, setTasks] = useState<WorkflowTaskRow[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [query, setQuery] = useState(initialJobNo);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<WorkflowTaskRow | null>(null);

  const loadTasks = () => {
    api('/tasks/my')
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(tasks.map((t) => resolveTaskDepartment(t)).filter(Boolean))).sort(),
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

  const sectionPendingStats = useMemo(() => {
    const stats: Record<string, number> = {};
    let totalPending = 0;
    tasks.forEach((t) => {
      const isPending = t.status === 'PENDING' || !t.status;
      if (isPending) {
        const sec = resolveTaskDepartment(t);
        stats[sec] = (stats[sec] || 0) + 1;
        totalPending++;
      }
    });
    return { stats, totalPending };
  }, [tasks]);

  const rows = useMemo(() => {
    return tasks.filter((t) => {
      const dept = resolveTaskDepartment(t);
      if (moduleFilter !== 'ALL' && String(t.module) !== moduleFilter) return false;
      if (departmentFilter !== 'ALL' && dept !== departmentFilter) return false;
      if (priorityFilter !== 'ALL' && String(t.priority) !== priorityFilter) return false;
      if (statusFilter !== 'ALL' && String(t.status) !== statusFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const jobStr = String(t.jobNo || t.order?.jobNo || '');
      const searchTarget = `${t.title} ${t.module} ${dept} ${jobStr} ${displayJobNo(t.order?.jobNo, t.order?.buyer)} ${buyerShortCode(t.order?.buyer?.code || t.order?.buyer?.name)}`.toLowerCase();
      return searchTarget.includes(q);
    });
  }, [tasks, moduleFilter, departmentFilter, priorityFilter, statusFilter, query]);

  const handleCompleteTask = async (task: WorkflowTaskRow) => {
    setBusyTaskId(task.id);
    setSuccessMsg('');
    try {
      await api('/tasks/update', {
        method: 'POST',
        body: JSON.stringify({
          taskId: task.id,
          status: 'COMPLETED'
        })
      });
      setSuccessMsg(`✓ Task "${task.title}" marked as COMPLETED and workflow advanced.`);
      loadTasks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setBusyTaskId(null);
    }
  };

  const columns = useMemo<GridColumn<WorkflowTaskRow>[]>(
    () => [
      {
        key: 'jobNo',
        header: 'Job No',
        width: 130,
        value: (t) => t.jobNo || t.order?.jobNo || '—',
        render: (t) => {
          const jobNum = t.jobNo || t.order?.jobNo;
          return (
            <div>
              {jobNum ? (
                <Link
                  href={`/jobs/${jobNum}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontWeight: 900,
                    color: '#2563eb',
                    textDecoration: 'none',
                    background: '#eff6ff',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: '1px solid #bfdbfe',
                    fontSize: '12px'
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
            </div>
          );
        }
      },
      {
        key: 'department',
        header: 'Department',
        width: 150,
        value: (t) => resolveTaskDepartment(t),
        render: (t) => (
          <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, color: '#334155', fontSize: '12px' }}>
            {resolveTaskDepartment(t)}
          </span>
        )
      },
      {
        key: 'title',
        header: 'Task Title & Workflow Objective',
        width: 340,
        value: (t) => `${t.title} ${t.description || ''}`,
        render: (t) => (
          <div>
            <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{t.title}</strong>
            {t.description && (
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                {t.description}
              </div>
            )}
          </div>
        )
      },
      {
        key: 'module',
        header: 'Module',
        width: 130,
        value: (t) => t.module,
        render: (t) => (
          <Link
            href={`/modules/${t.module}`}
            onClick={(e) => e.stopPropagation()}
            style={{ color: '#0369a1', textDecoration: 'none', fontWeight: 600, fontSize: '12px' }}
          >
            {t.module} ↗
          </Link>
        )
      },
      {
        key: 'priority',
        header: 'Priority',
        width: 110,
        value: (t) => t.priority,
        render: (t) => (
          <Badge tone={t.priority === 'CRITICAL' ? 'balance' : t.priority === 'HIGH' ? 'mid' : 'neutral'}>
            {t.priority}
          </Badge>
        )
      },
      {
        key: 'status',
        header: 'Status',
        width: 130,
        value: (t) => t.status,
        render: (t) => {
          const isCompleted = t.status === 'COMPLETED';
          return (
            <Badge tone={isCompleted ? 'done' : t.status === 'IN_PROGRESS' ? 'mid' : 'info'}>
              {isCompleted ? '✓ COMPLETED' : t.status}
            </Badge>
          );
        }
      },
      {
        key: 'actions',
        header: 'Actions',
        width: 170,
        align: 'right',
        filterable: false,
        value: (t) => t.status,
        render: (t) => {
          const jobNum = t.jobNo || t.order?.jobNo;
          const isCompleted = t.status === 'COMPLETED';
          return (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
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
                  type="button"
                  onClick={() => handleCompleteTask(t)}
                  disabled={busyTaskId === t.id}
                  style={{
                    background: '#16a34a',
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
          );
        }
      }
    ],
    [busyTaskId]
  );

  const recordSections = useMemo<RecordSection[]>(() => {
    if (!selectedTask) return [];
    const jobNum = selectedTask.jobNo || selectedTask.order?.jobNo || '—';
    return [
      {
        name: 'Workflow Task Details',
        fields: [
          { key: 'jobNo', label: 'Job No', value: jobNum, readOnly: true },
          { key: 'department', label: 'Department', value: resolveTaskDepartment(selectedTask), readOnly: true },
          { key: 'module', label: 'Module', value: selectedTask.module, readOnly: true },
          { key: 'priority', label: 'Priority', value: selectedTask.priority, readOnly: true },
          { key: 'status', label: 'Status', value: selectedTask.status, readOnly: true },
          { key: 'dueDate', label: 'Due Date', value: fmtDate(selectedTask.dueDate), readOnly: true },
          { key: 'title', label: 'Task Title', value: selectedTask.title, readOnly: true, fullWidth: true },
          { key: 'description', label: 'Objective / Notes', value: selectedTask.description || '—', readOnly: true, fullWidth: true }
        ]
      }
    ];
  }, [selectedTask]);

  return (
    <Shell title="My Pending Tasks">
      <div className="card" style={{ padding: '20px' }}>
        {error && <div className="notice" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}
        {successMsg && <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', fontWeight: 700 }}>{successMsg}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>My Pending Work &amp; Department Tasks</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/merchandising-bulk" className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none' }}>
              + Import Another PO
            </Link>
            <Link href="/jobs?tab=preproduction" className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none' }}>
              ⚡ Pre-Production Stage Control
            </Link>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>Section-wise Pending Tasks Summary</strong>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Click a section below to filter its pending queue</div>
            </div>
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '5px 14px', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Total Pending:</span>
              <strong style={{ fontSize: '17px', fontWeight: 900, color: '#dc2626' }}>{fmtNum(sectionPendingStats.totalPending)}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
            <button
              type="button"
              onClick={() => { setDepartmentFilter('ALL'); setStatusFilter('PENDING'); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px',
                borderRadius: '8px', border: departmentFilter === 'ALL' && statusFilter === 'PENDING' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: departmentFilter === 'ALL' && statusFilter === 'PENDING' ? '#eff6ff' : '#ffffff',
                cursor: 'pointer', textAlign: 'left'
              }}
            >
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1e293b' }}>All Sections</div>
                <div style={{ fontSize: '9.5px', color: '#64748b' }}>Total Sum</div>
              </div>
              <span style={{ background: '#dc2626', color: '#fff', fontSize: '11.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '5px' }}>
                {fmtNum(sectionPendingStats.totalPending)}
              </span>
            </button>

            {Object.entries(sectionPendingStats.stats).map(([secName, count]) => {
              const isSelected = departmentFilter === secName && statusFilter === 'PENDING';
              return (
                <button
                  key={secName}
                  type="button"
                  onClick={() => { setDepartmentFilter(secName); setStatusFilter('PENDING'); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px',
                    borderRadius: '8px', border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{secName}</div>
                    <div style={{ fontSize: '9.5px', color: '#64748b' }}>Pending tasks</div>
                  </div>
                  <span style={{ background: '#d97706', color: '#fff', fontSize: '11.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '5px', marginLeft: '6px' }}>
                    {fmtNum(count)}
                  </span>
                </button>
              );
            })}
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
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </label>
        </div>

        <DataGrid<WorkflowTaskRow>
          storageKey="department-tasks-grid"
          exportName="department-tasks"
          rows={rows}
          columns={columns}
          frozenColumns={2}
          rowKey={(t) => t.id}
          selectedRowKey={selectedTask?.id ?? null}
          onRowClick={(t) => setSelectedTask(t)}
          emptyMessage="No pending tasks found for this filter."
        />

        <RecordPanel
          open={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          title={selectedTask ? selectedTask.title : ''}
          subtitle={selectedTask ? `${resolveTaskDepartment(selectedTask)} · ${selectedTask.module}` : undefined}
          sections={recordSections}
        />
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
