'use client';
// NOS RecordPanel — right-side record view/edit drawer (docs/UX-STANDARD.md §8)
import React, { useEffect, useMemo, useState } from 'react';
import './recordpanel.css';
import { Button, Badge } from './index';
import { fmtDate, fmtNum } from '../../lib/format';

export type FieldOption = string | { value: string; label: string };

export interface Field<T = any> {
  key: string;
  label: string;
  value?: any;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'status' | 'readonly';
  unit?: string;
  options?: FieldOption[];
  fullWidth?: boolean;
  span?: 1 | 2;
  step?: number;
  readOnly?: boolean;
  setByRole?: string;
  lockedByRole?: string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  validate?: (value: any, allValues: Record<string, any>) => string | null | undefined;
  renderReadOnly?: (value: any, record: T) => React.ReactNode;
  format?: (value: any, record: T) => React.ReactNode;
  render?: (value: any, record: T) => React.ReactNode;
}

export type RecordPanelField<T = any> = Field<T>;

export interface RecordSection<T = any> {
  name?: string;
  title?: string;
  id?: string;
  key?: string;
  defaultCollapsed?: boolean;
  defaultOpen?: boolean;
  fields: Field<T>[];
  customContent?: React.ReactNode | ((record: T) => React.ReactNode);
  renderCustom?: (record: T) => React.ReactNode;
  children?: React.ReactNode;
}

export type RecordPanelSection<T = any> = RecordSection<T>;

export interface RecordHistoryEntry {
  id: string;
  at: string;
  by: string;
  summary: string;
}

export interface RecordStatusBadge {
  label: string;
  tone?: 'done' | 'balance' | 'mid' | 'info' | 'quiet' | 'ok' | 'bad' | 'warn' | 'good' | string;
}

export interface RecordPanelProps<T = any> {
  open: boolean;
  onClose: () => void;
  record?: T | null;
  rows?: T[];
  rowKey?: (row: T) => string | number;
  getRowId?: (row: T) => string | number;
  activeKey?: string | number | null;
  onNavigate?: (nextKey: string) => void;
  onSelectRow?: (row: T) => void;
  title: string | ((record: T) => string);
  subtitle?: string | ((record: T) => string);
  statusBadge?: RecordStatusBadge | ((record: T) => RecordStatusBadge | null | undefined);
  sections: RecordSection<T>[] | ((record: T) => RecordSection<T>[]);
  onSave?: (updated: any, patch?: any) => void | Promise<void>;
  onDelete?: (record: T) => void | Promise<void>;
  onUndoDelete?: (record: T) => void | Promise<void>;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  canEdit?: boolean;
  /** Map of fieldKey -> role name (e.g. { requiredKg: 'Merchandising' }) or array of field keys */
  readOnlyFields?: Record<string, string> | string[];
  /** Optional initial history entries (shown to ADMIN only) */
  history?: RecordHistoryEntry[];
  /** Optional extra footer or header action node */
  extraFooter?: React.ReactNode | ((record: T) => React.ReactNode);
  footerActions?: React.ReactNode | ((record: T) => React.ReactNode);
  footerSlot?: React.ReactNode | ((record: T) => React.ReactNode);
}

function isUserAdmin(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const role = (localStorage.getItem('nos-user-role') || 'ADMIN').toUpperCase();
    return ['ADMIN', 'DIRECTOR', 'OWNER', 'HEAD_MERCHANDISER', 'MANAGEMENT_HEAD'].includes(role);
  } catch {
    return true;
  }
}

function getCurrentUserName(): string {
  if (typeof window === 'undefined') return 'Admin';
  try {
    const persona = localStorage.getItem('nos-active-persona-id');
    if (persona === 'user-director') return 'Managing Director';
    if (persona === 'user-imran') return 'Md. Imran';
    if (persona === 'user-basir') return 'Basir Hossain';
    if (persona === 'user-cad') return 'Rafiqul Islam (CAD)';
    if (persona === 'user-ie') return 'Engr. Kabir Hossain (IE)';
    if (persona === 'user-lab') return 'Dr. Nazrul Islam (Lab)';
    if (persona === 'user-planning') return 'Shahidul Alam (Planning)';
    return 'Tariqul Islam (Admin)';
  } catch {
    return 'Admin';
  }
}

export function RecordPanel<T = any>({
  open,
  onClose,
  record: rawRecord,
  rows,
  rowKey,
  getRowId,
  activeKey,
  onNavigate,
  onSelectRow,
  title: rawTitle,
  subtitle: rawSubtitle,
  statusBadge: rawStatusBadge,
  sections: rawSections,
  onSave,
  onDelete,
  onUndoDelete,
  onPrev: rawOnPrev,
  onNext: rawOnNext,
  prevDisabled,
  nextDisabled,
  canEdit = true,
  readOnlyFields,
  history: initialHistory = [],
  extraFooter,
  footerActions,
  footerSlot,
}: RecordPanelProps<T>) {
  const keyFn = useMemo(
    () => rowKey ?? getRowId ?? ((r: any) => r?.id ?? r?._key ?? r?._rowKey ?? ''),
    [rowKey, getRowId],
  );

  const activeRecord = useMemo<T | null>(() => {
    if (rawRecord !== undefined) return rawRecord;
    if (rows && activeKey !== undefined && activeKey !== null) {
      return rows.find((r) => String(keyFn(r)) === String(activeKey)) ?? null;
    }
    return null;
  }, [rawRecord, rows, activeKey, keyFn]);

  const currentIdx = useMemo(() => {
    if (!rows || !rows.length) return -1;
    if (activeKey !== undefined && activeKey !== null) {
      return rows.findIndex((r) => String(keyFn(r)) === String(activeKey));
    }
    if (activeRecord) {
      const k = String(keyFn(activeRecord));
      return rows.findIndex((r) => String(keyFn(r)) === k);
    }
    return -1;
  }, [rows, activeKey, activeRecord, keyFn]);

  const onPrev = useMemo(() => {
    if (prevDisabled) return undefined;
    if (rawOnPrev) return rawOnPrev;
    if (rows && currentIdx > 0) {
      return () => {
        const prevRow = rows[currentIdx - 1];
        if (onSelectRow) onSelectRow(prevRow);
        if (onNavigate) onNavigate(String(keyFn(prevRow)));
      };
    }
    return undefined;
  }, [prevDisabled, rawOnPrev, rows, currentIdx, onSelectRow, onNavigate, keyFn]);

  const onNext = useMemo(() => {
    if (nextDisabled) return undefined;
    if (rawOnNext) return rawOnNext;
    if (rows && currentIdx >= 0 && currentIdx < rows.length - 1) {
      return () => {
        const nextRow = rows[currentIdx + 1];
        if (onSelectRow) onSelectRow(nextRow);
        if (onNavigate) onNavigate(String(keyFn(nextRow)));
      };
    }
    return undefined;
  }, [nextDisabled, rawOnNext, rows, currentIdx, onSelectRow, onNavigate, keyFn]);

  const title = useMemo(() => {
    if (typeof rawTitle === 'function') {
      return activeRecord ? rawTitle(activeRecord) : '';
    }
    return rawTitle || '';
  }, [rawTitle, activeRecord]);

  const subtitle = useMemo(() => {
    if (!rawSubtitle) return undefined;
    if (typeof rawSubtitle === 'function') {
      return activeRecord ? rawSubtitle(activeRecord) : undefined;
    }
    return rawSubtitle;
  }, [rawSubtitle, activeRecord]);

  const badgeObj = useMemo(() => {
    if (!rawStatusBadge) return null;
    if (typeof rawStatusBadge === 'function') {
      return activeRecord ? rawStatusBadge(activeRecord) : null;
    }
    return rawStatusBadge;
  }, [rawStatusBadge, activeRecord]);

  const sections = useMemo(() => {
    const list = typeof rawSections === 'function' ? (activeRecord ? rawSections(activeRecord) : []) : rawSections;
    return (list || []).map((sec, idx) => ({
      ...sec,
      name: sec.name || sec.title || sec.key || sec.id || `Section ${idx + 1}`,
      defaultCollapsed: sec.defaultCollapsed ?? (sec.defaultOpen === false ? true : false),
      fields: (sec.fields || []).map((f) => ({
        ...f,
        value: f.value !== undefined ? f.value : activeRecord ? (activeRecord as any)[f.key] : '',
        readOnly: f.readOnly || f.type === 'readonly',
        setByRole: f.setByRole || f.lockedByRole,
        fullWidth: f.fullWidth || f.span === 2,
        renderReadOnly: f.renderReadOnly || f.format || f.render,
      })),
    }));
  }, [rawSections, activeRecord]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [confirmDiscard, setConfirmDiscard] = useState<'close' | 'prev' | 'next' | 'cancel' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletedToast, setDeletedToast] = useState<string | null>(null);
  const [historyLog, setHistoryLog] = useState<RecordHistoryEntry[]>(initialHistory);
  const [adminView, setAdminView] = useState(true);

  useEffect(() => {
    setAdminView(isUserAdmin());
  }, [open]);

  // Flatten initial values whenever record (title or sections) changes
  const initialValues = useMemo(() => {
    const map: Record<string, any> = {};
    sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        map[f.key] = f.value ?? '';
      });
    });
    return map;
  }, [sections]);

  useEffect(() => {
    setDraft(initialValues);
    setErrors({});
    setEditing(false);
    setConfirmDiscard(null);
    setConfirmDelete(false);
    const initCollapsed: Record<string, boolean> = {};
    sections.forEach((s) => {
      if (s.defaultCollapsed) initCollapsed[s.name] = true;
    });
    setCollapsed((prev) => ({ ...initCollapsed, ...prev }));
  }, [title, initialValues, open]);

  // Normalize readOnlyFields lookup
  const roleLockMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(readOnlyFields)) {
      readOnlyFields.forEach((k) => {
        map[k] = 'Authorized role';
      });
    } else if (readOnlyFields && typeof readOnlyFields === 'object') {
      Object.entries(readOnlyFields).forEach(([k, v]) => {
        map[k] = v || 'Authorized role';
      });
    }
    sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        if (f.setByRole) map[f.key] = f.setByRole;
        else if (f.readOnly && !map[f.key]) map[f.key] = 'System';
      });
    });
    return map;
  }, [readOnlyFields, sections]);

  const isDirty = useMemo(() => {
    if (!editing) return false;
    return Object.keys(initialValues).some((k) => String(draft[k] ?? '') !== String(initialValues[k] ?? ''));
  }, [editing, draft, initialValues]);

  // Esc key handling
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (isDirty) setConfirmDiscard('close');
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isDirty, onClose]);

  const requestAction = (action: 'close' | 'prev' | 'next' | 'cancel') => {
    if (isDirty) {
      setConfirmDiscard(action);
      return;
    }
    executeAction(action);
  };

  const executeAction = (action: 'close' | 'prev' | 'next' | 'cancel') => {
    setConfirmDiscard(null);
    setErrors({});
    if (action === 'cancel') {
      setDraft(initialValues);
      setEditing(false);
    } else if (action === 'close') {
      setEditing(false);
      onClose();
    } else if (action === 'prev') {
      setEditing(false);
      onPrev?.();
    } else if (action === 'next') {
      setEditing(false);
      onNext?.();
    }
  };

  const validateAll = (): boolean => {
    const nextErrors: Record<string, string> = {};
    sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        if (f.readOnly || roleLockMap[f.key]) return;
        const val = draft[f.key];
        if (f.required && (val === undefined || val === null || String(val).trim() === '')) {
          nextErrors[f.key] = 'Required';
          return;
        }
        if (f.type === 'number' && val !== '' && val !== null && val !== undefined) {
          const num = Number(val);
          if (!Number.isFinite(num)) {
            nextErrors[f.key] = 'Invalid number';
            return;
          }
          if (f.min !== undefined && num < f.min) {
            nextErrors[f.key] = `Min ${f.min}`;
            return;
          }
          if (f.max !== undefined && num > f.max) {
            nextErrors[f.key] = `Max ${f.max}`;
            return;
          }
        }
        if (f.validate) {
          const customErr = f.validate(val, draft);
          if (customErr) nextErrors[f.key] = customErr;
        }
      });
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateAll()) return;
    // Build change summary for ADMIN history
    const changedDiffs: string[] = [];
    sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        const before = initialValues[f.key];
        const after = draft[f.key];
        if (String(before ?? '') !== String(after ?? '')) {
          changedDiffs.push(`${f.label}: ${before ?? '—'} → ${after ?? '—'}`);
        }
      });
    });

    if (onSave) {
      const merged = activeRecord && typeof activeRecord === 'object' ? { ...activeRecord, ...draft } : draft;
      await onSave(merged, draft);
    }

    if (changedDiffs.length > 0) {
      const entry: RecordHistoryEntry = {
        id: `hist-${Date.now()}`,
        at: new Date().toISOString(),
        by: getCurrentUserName(),
        summary: changedDiffs.join('; '),
      };
      setHistoryLog((prev) => [entry, ...prev]);
    }
    setEditing(false);
    setConfirmDiscard(null);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    await onDelete((activeRecord ?? draft) as T);
    setConfirmDelete(false);
    setDeletedToast(title);
    onClose();
    setTimeout(() => {
      setDeletedToast((cur) => (cur === title ? null : cur));
    }, 6000);
  };

  const renderStatusTone = (val: string): 'done' | 'balance' | 'mid' | 'info' | 'quiet' => {
    const s = String(val || '').toLowerCase();
    if (s.includes('stock') || s.includes('pass') || s.includes('done') || s.includes('complete') || s.includes('accept') || s.includes('approv')) return 'done';
    if (s.includes('hold') || s.includes('fail') || s.includes('reject') || s.includes('overdue') || s.includes('late') || s.includes('critical')) return 'balance';
    if (s.includes('part') || s.includes('wait') || s.includes('pend') || s.includes('progress')) return 'mid';
    return 'info';
  };

  const renderFieldValue = (f: Field<T>) => {
    const raw = draft[f.key];
    if (f.renderReadOnly) return f.renderReadOnly(raw, (activeRecord ?? draft) as T);
    if (raw === null || raw === undefined || raw === '') return <span style={{ color: 'var(--nos-ink-3)' }}>—</span>;
    if (f.type === 'status') {
      return <Badge tone={renderStatusTone(String(raw))}>{String(raw)}</Badge>;
    }
    if (f.type === 'date') {
      return <span>{fmtDate(raw)}</span>;
    }
    if (f.type === 'number') {
      return (
        <>
          <span>{fmtNum(Number(raw))}</span>
          {f.unit && <span className="nos-rp-unit">{f.unit}</span>}
        </>
      );
    }
    return (
      <>
        <span>{String(raw)}</span>
        {f.unit && <span className="nos-rp-unit">{f.unit}</span>}
      </>
    );
  };

  const customFooterNode = useMemo(() => {
    const fnOrNode = extraFooter ?? footerActions ?? footerSlot;
    if (!fnOrNode) return null;
    if (typeof fnOrNode === 'function') {
      return activeRecord ? fnOrNode(activeRecord) : null;
    }
    return fnOrNode;
  }, [extraFooter, footerActions, footerSlot, activeRecord]);

  if (!open && !deletedToast) return null;

  return (
    <>
      {open && (
        <div
          className="nos-rp-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) requestAction('close');
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <aside className="nos-rp-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <header className="nos-rp-hd">
              <div className="nos-rp-hd-titles">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 className="nos-rp-title">{title}</h2>
                  {badgeObj && <Badge tone={(badgeObj.tone as any) || 'info'}>{badgeObj.label}</Badge>}
                </div>
                {subtitle && <div className="nos-rp-subtitle">{subtitle}</div>}
              </div>
              <div className="nos-rp-hd-actions">
                <button
                  type="button"
                  className="nos-rp-iconbtn"
                  onClick={() => requestAction('prev')}
                  disabled={!onPrev}
                  title="Previous row"
                  aria-label="Previous row"
                >
                  ◀
                </button>
                <button
                  type="button"
                  className="nos-rp-iconbtn"
                  onClick={() => requestAction('next')}
                  disabled={!onNext}
                  title="Next row"
                  aria-label="Next row"
                >
                  ▶
                </button>
                <button
                  type="button"
                  className="nos-rp-iconbtn"
                  onClick={() => requestAction('close')}
                  title="Close (Esc)"
                  aria-label="Close panel"
                >
                  ×
                </button>
              </div>
            </header>

            {/* Unsaved changes confirmation bar */}
            {confirmDiscard && (
              <div className="nos-rp-unsaved" role="alert">
                <span>You have unsaved changes. Discard changes?</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="sm" variant="danger" onClick={() => executeAction(confirmDiscard)}>
                    Discard
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDiscard(null)}>
                    Keep editing
                  </Button>
                </div>
              </div>
            )}

            {/* Delete confirmation bar */}
            {confirmDelete && (
              <div className="nos-rp-unsaved" role="alert">
                <span>Delete this record? You can undo right after.</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="sm" variant="danger" onClick={handleDelete}>
                    Delete
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="nos-rp-body">
              {sections.map((sec) => {
                const isCollapsed = !!collapsed[sec.name];
                const customSecNode =
                  typeof sec.customContent === 'function'
                    ? activeRecord
                      ? sec.customContent(activeRecord)
                      : null
                    : sec.customContent ?? (sec.renderCustom && activeRecord ? sec.renderCustom(activeRecord) : sec.children);
                return (
                  <section key={sec.name} className="nos-rp-sec">
                    <button
                      type="button"
                      className={`nos-rp-sec-hd ${isCollapsed ? 'collapsed' : ''}`}
                      onClick={() => setCollapsed((prev) => ({ ...prev, [sec.name]: !prev[sec.name] }))}
                      aria-expanded={!isCollapsed}
                    >
                      <span>{sec.name}</span>
                      <span>{isCollapsed ? '▸' : '▾'}</span>
                    </button>
                    {!isCollapsed && (
                      <>
                        {sec.fields.length > 0 && (
                          <div className="nos-rp-grid">
                            {sec.fields.map((f) => {
                              const lockedBy = roleLockMap[f.key];
                              const isFieldReadOnly = !editing || !!f.readOnly || !!lockedBy;
                              const isLong =
                                f.fullWidth ||
                                f.type === 'textarea' ||
                                String(draft[f.key] ?? '').length > 36;
                              const err = errors[f.key];

                              return (
                                <div key={f.key} className={`nos-rp-field ${isLong ? 'full' : ''}`}>
                                  <div className="nos-rp-label-row">
                                    <label className="nos-rp-label" htmlFor={`rp-field-${f.key}`}>
                                      {f.label}
                                      {editing && f.required && !isFieldReadOnly ? ' *' : ''}
                                    </label>
                                    {err ? (
                                      <span className="nos-rp-err">{err}</span>
                                    ) : lockedBy ? (
                                      <span className="nos-rp-role-lock">Set by {lockedBy}</span>
                                    ) : null}
                                  </div>

                                  {isFieldReadOnly ? (
                                    <div className={`nos-rp-val ${f.type === 'number' ? 'num' : ''}`}>
                                      {renderFieldValue(f)}
                                    </div>
                                  ) : f.type === 'select' || f.type === 'status' ? (
                                    <select
                                      id={`rp-field-${f.key}`}
                                      className={`nos-rp-select ${err ? 'invalid' : ''}`}
                                      value={String(draft[f.key] ?? '')}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setDraft((prev) => ({ ...prev, [f.key]: v }));
                                        if (errors[f.key]) setErrors((prev) => ({ ...prev, [f.key]: '' }));
                                      }}
                                    >
                                      {(f.options || []).map((opt) => {
                                        const val = typeof opt === 'string' ? opt : opt.value;
                                        const lbl = typeof opt === 'string' ? opt : opt.label;
                                        return (
                                          <option key={val} value={val}>
                                            {lbl}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  ) : f.type === 'textarea' ? (
                                    <textarea
                                      id={`rp-field-${f.key}`}
                                      className={`nos-rp-textarea ${err ? 'invalid' : ''}`}
                                      value={String(draft[f.key] ?? '')}
                                      placeholder={f.placeholder}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setDraft((prev) => ({ ...prev, [f.key]: v }));
                                        if (errors[f.key]) setErrors((prev) => ({ ...prev, [f.key]: '' }));
                                      }}
                                    />
                                  ) : (
                                    <input
                                      id={`rp-field-${f.key}`}
                                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                      step={f.step}
                                      className={`nos-rp-input ${err ? 'invalid' : ''}`}
                                      value={String(draft[f.key] ?? '')}
                                      placeholder={f.placeholder}
                                      onChange={(e) => {
                                        const v = f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                                        setDraft((prev) => ({ ...prev, [f.key]: v }));
                                        if (errors[f.key]) setErrors((prev) => ({ ...prev, [f.key]: '' }));
                                      }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {customSecNode}
                      </>
                    )}
                  </section>
                );
              })}

              {/* History section — visible to ADMIN only */}
              {adminView && (
                <section className="nos-rp-sec">
                  <button
                    type="button"
                    className={`nos-rp-sec-hd ${collapsed['__history'] ? 'collapsed' : ''}`}
                    onClick={() => setCollapsed((prev) => ({ ...prev, __history: !prev.__history }))}
                  >
                    <span>History (Admin only)</span>
                    <span>{collapsed['__history'] ? '▸' : '▾'}</span>
                  </button>
                  {!collapsed['__history'] && (
                    <div className="nos-rp-history-list">
                      {historyLog.length === 0 ? (
                        <span style={{ color: 'var(--nos-ink-3)' }}>No changes recorded in this session.</span>
                      ) : (
                        historyLog.map((h) => (
                          <div key={h.id} className="nos-rp-history-item">
                            <div className="nos-rp-history-meta">
                              <strong>{h.by}</strong>
                              <span>{fmtDate(h.at)}</span>
                            </div>
                            <div>{h.summary}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Pinned Footer */}
            <footer className="nos-rp-ft">
              <div>
                {onDelete && editing && (
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </Button>
                )}
                {!editing && customFooterNode}
              </div>
              <div className="nos-rp-ft-right">
                {!editing ? (
                  <>
                    <Button variant="secondary" onClick={() => requestAction('close')}>
                      Close
                    </Button>
                    {canEdit && onSave && (
                      <Button variant="primary" onClick={() => setEditing(true)}>
                        Edit
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => requestAction('cancel')}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                      Save
                    </Button>
                  </>
                )}
              </div>
            </footer>
          </aside>
        </div>
      )}

      {/* Undo toast after delete */}
      {deletedToast && (
        <div className="nos-rp-undo-toast" role="status">
          <span>Deleted {deletedToast}</span>
          {onUndoDelete && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onUndoDelete((activeRecord ?? draft) as T);
                setDeletedToast(null);
              }}
            >
              Undo
            </Button>
          )}
          <button
            type="button"
            onClick={() => setDeletedToast(null)}
            style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 14 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

export default RecordPanel;
