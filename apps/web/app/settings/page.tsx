'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Shell from '../../components/Shell';
import { Card, Button, Badge, CommandBar, useToast } from '../../components/ui';
import DataGrid, { GridColumn } from '../../components/ui/DataGrid';
import RecordPanel from '../../components/ui/RecordPanel';
import { fmtDate, fmtNum } from '../../lib/format';
import {
  CompanySettingsData,
  CompanyUserAccount,
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_USER_APPEARANCE,
  ElementSizeOption,
  MasterCategoryKey,
  MasterItem,
  UserAppearanceSettings,
  applyUserSettingsToDocument,
  loadCompanySettings,
  loadUserSettings,
  saveCompanySettings,
  saveUserSettings,
} from '../../lib/settings';

const MASTER_CATEGORIES: { key: MasterCategoryKey; label: string; hint: string }[] = [
  { key: 'factories', label: 'Factories, Lines & Capacities', hint: 'Knitting, dyeing, sewing, printing & embroidery capacities' },
  { key: 'buyers', label: 'Buyers & Sub-brands', hint: 'Active buyers and sub-brand divisions' },
  { key: 'merchandisers', label: 'Merchandisers & Teams', hint: 'Team assignments and buyer scopes' },
  { key: 'racks', label: 'Store Racks & Shelves', hint: 'Yarn, Greige, and Finished Fabric store locations' },
  { key: 'reasons', label: 'Reason Lists', hint: 'NPT, rejection, rework, delay, and store return reasons' },
  { key: 'finishingProcesses', label: 'Finishing Processes', hint: 'AOP, Brush, Peach, Enzyme, Silicone, etc.' },
  { key: 'sampleTypes', label: 'Sample Types', hint: 'Proto, Fit, SMS, PP, Size Set, Gold Seal, Shipment' },
  { key: 'statuses', label: 'Statuses & Stage Names', hint: 'Workflow stage names across departments' },
  { key: 'units', label: 'Units of Measure', hint: 'kg, ton, pcs, dz, yds, m, cone, roll, carton' },
  { key: 'garmentPartsByItem', label: 'Garment Parts & Fabric Types per Item', hint: 'Auto-suggest rules for order entry' },
  { key: 'commonTrimsByItem', label: 'Common Trims per Garment Item', hint: 'Auto-tick templates for trims checklist' },
];

export default function SettingsPage() {
  const { show } = useToast();
  const [level, setLevel] = useState<'my' | 'company'>('my');
  const [companySubTab, setCompanySubTab] = useState<'masters' | 'rules' | 'appearance' | 'users' | 'history'>('masters');
  const [activeMasterCat, setActiveMasterCat] = useState<MasterCategoryKey>('factories');

  const [company, setCompany] = useState<CompanySettingsData>(DEFAULT_COMPANY_SETTINGS);
  const [mySettings, setMySettings] = useState<UserAppearanceSettings>(DEFAULT_USER_APPEARANCE);
  const [previewMode, setPreviewMode] = useState(false);

  // Selected items for RecordPanel editing
  const [selectedMaster, setSelectedMaster] = useState<MasterItem | null>(null);
  const [addingMaster, setAddingMaster] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CompanyUserAccount | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    setCompany(loadCompanySettings());
    const usr = loadUserSettings();
    setMySettings(usr);
    try {
      const r = (localStorage.getItem('nos-user-role') || 'ADMIN').toUpperCase();
      setIsAdmin(['ADMIN', 'DIRECTOR', 'OWNER', 'HEAD_MERCHANDISER', 'MANAGEMENT_HEAD'].includes(r));
    } catch {}
  }, []);

  const handlePreviewMySettings = () => {
    applyUserSettingsToDocument(mySettings);
    setPreviewMode(true);
    show('Previewing appearance settings on this screen', 'info');
  };

  const handleSaveMySettings = () => {
    saveUserSettings(mySettings, undefined, `Saved personal display (${mySettings.theme}, ${mySettings.tableDensity})`);
    setCompany(loadCompanySettings());
    setPreviewMode(false);
    show('Personal settings saved to your account', 'ok');
  };

  const handleResetMySettings = () => {
    setMySettings(DEFAULT_USER_APPEARANCE);
    saveUserSettings(DEFAULT_USER_APPEARANCE, undefined, 'Reset personal settings to company default');
    setCompany(loadCompanySettings());
    setPreviewMode(false);
    show('Reset to default settings', 'ok');
  };

  const masterRows = useMemo(
    () => company.masters[activeMasterCat] || [],
    [company.masters, activeMasterCat],
  );

  const masterColumns: GridColumn<MasterItem>[] = useMemo(
    () => [
      { key: 'name', header: 'Name / Description', width: 240 },
      { key: 'code', header: 'Code', width: 110 },
      { key: 'meta', header: 'Details / Capacity / Rule', width: 280 },
      {
        key: 'usedInJobsCount',
        header: 'Used in Jobs',
        width: 115,
        numeric: true,
        render: (r) => fmtNum(r.usedInJobsCount ?? 0),
      },
      {
        key: 'active',
        header: 'Status',
        width: 110,
        value: (r) => (r.active ? 'Active' : 'Turned Off'),
        render: (r) => (
          <Badge tone={r.active ? 'done' : 'quiet'}>{r.active ? 'Active' : 'Turned Off'}</Badge>
        ),
      },
    ],
    [],
  );

  const userColumns: GridColumn<CompanyUserAccount>[] = useMemo(
    () => [
      { key: 'name', header: 'Full Name', width: 200 },
      { key: 'email', header: 'Email', width: 210 },
      { key: 'role', header: 'Role', width: 150 },
      { key: 'department', header: 'Department', width: 180 },
      { key: 'buyerScope', header: 'Buyer / Team Scope', width: 140 },
      {
        key: 'active',
        header: 'Account Status',
        width: 120,
        value: (r) => (r.active ? 'Active' : 'Disabled'),
        render: (r) => (
          <Badge tone={r.active ? 'done' : 'balance'}>{r.active ? 'Active' : 'Disabled'}</Badge>
        ),
      },
    ],
    [],
  );

  const elementSizeLabels: { key: keyof UserAppearanceSettings['elementSizes']; label: string }[] = [
    { key: 'pageTitle', label: 'Page Title' },
    { key: 'sectionHeading', label: 'Section Heading' },
    { key: 'cardNumber', label: 'Card Number (KPI)' },
    { key: 'tableHeader', label: 'Table Header' },
    { key: 'tableCell', label: 'Table Cell' },
    { key: 'formLabel', label: 'Form Label' },
    { key: 'sidebar', label: 'Sidebar Menu' },
    { key: 'button', label: 'Button Label' },
  ];

  return (
    <Shell title="Settings & System Governance" eyebrow="Company Master Lists, Plant Targets & Personal Display">
      <CommandBar
        left={
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <Button
              variant={level === 'my' ? 'primary' : 'secondary'}
              onClick={() => setLevel('my')}
            >
              My Settings (Personal)
            </Button>
            {isAdmin && (
              <Button
                variant={level === 'company' ? 'primary' : 'secondary'}
                onClick={() => setLevel('company')}
              >
                Company Settings (Admin)
              </Button>
            )}
          </div>
        }
        right={
          level === 'my' ? (
            <div style={{ display: 'inline-flex', gap: 8 }}>
              <Button variant="secondary" onClick={handleResetMySettings}>
                Reset to Default
              </Button>
              <Button variant="secondary" onClick={handlePreviewMySettings}>
                Preview
              </Button>
              <Button variant="primary" onClick={handleSaveMySettings}>
                Save My Settings
              </Button>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', gap: 8 }}>
              <Button
                variant="secondary"
                onClick={() => {
                  const reset = saveCompanySettings(DEFAULT_COMPANY_SETTINGS, 'Reset company settings to factory defaults');
                  setCompany(reset);
                  show('Company settings reset to default', 'info');
                }}
              >
                Reset Defaults
              </Button>
            </div>
          )
        }
      />

      {/* ===================================================================== */}
      {/* B. MY SETTINGS (EVERY USER) */}
      {/* ===================================================================== */}
      {level === 'my' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
          <Card
            title="Text Size per Element"
            action={<Badge tone={previewMode ? 'mid' : 'info'}>{previewMode ? 'Preview Active' : 'Saved to Account'}</Badge>}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {elementSizeLabels.map((item) => (
                <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600 }}>
                    {item.label}
                  </span>
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    {(['Small', 'Medium', 'Large'] as ElementSizeOption[]).map((sz) => {
                      const active = mySettings.elementSizes[item.key] === sz;
                      return (
                        <Button
                          key={sz}
                          size="sm"
                          variant={active ? 'primary' : 'secondary'}
                          onClick={() =>
                            setMySettings((prev) => ({
                              ...prev,
                              elementSizes: { ...prev.elementSizes, [item.key]: sz },
                            }))
                          }
                        >
                          {sz}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Layout, Theme & Start Page">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Card Size
                  </label>
                  <select
                    className="nos-slicer-select"
                    style={{ width: '100%' }}
                    value={mySettings.cardSize}
                    onChange={(e) =>
                      setMySettings((prev) => ({ ...prev, cardSize: e.target.value as UserAppearanceSettings['cardSize'] }))
                    }
                  >
                    <option value="Compact">Compact</option>
                    <option value="Standard">Standard</option>
                    <option value="Spacious">Spacious</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Default Chart Size
                  </label>
                  <select
                    className="nos-slicer-select"
                    style={{ width: '100%' }}
                    value={mySettings.chartSize}
                    onChange={(e) =>
                      setMySettings((prev) => ({ ...prev, chartSize: e.target.value as UserAppearanceSettings['chartSize'] }))
                    }
                  >
                    <option value="Small (180px)">Small (180px)</option>
                    <option value="Large (260px)">Large (260px)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Table Row Spacing
                  </label>
                  <select
                    className="nos-slicer-select"
                    style={{ width: '100%' }}
                    value={mySettings.tableDensity}
                    onChange={(e) =>
                      setMySettings((prev) => ({
                        ...prev,
                        tableDensity: e.target.value as 'compact' | 'comfortable',
                      }))
                    }
                  >
                    <option value="comfortable">Comfortable (31px)</option>
                    <option value="compact">Compact (25px)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Day / Night Mode
                  </label>
                  <select
                    className="nos-slicer-select"
                    style={{ width: '100%' }}
                    value={mySettings.theme}
                    onChange={(e) =>
                      setMySettings((prev) => ({
                        ...prev,
                        theme: e.target.value as 'light' | 'dark',
                      }))
                    }
                  >
                    <option value="light">Day (Light)</option>
                    <option value="dark">Night (Dark)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                  Page That Opens After Login
                </label>
                <select
                  className="nos-slicer-select"
                  style={{ width: '100%' }}
                  value={mySettings.loginStartPage}
                  onChange={(e) =>
                    setMySettings((prev) => ({ ...prev, loginStartPage: e.target.value }))
                  }
                >
                  <option value="/management">Management Dashboard (/management)</option>
                  <option value="/">Executive Dashboard (/)</option>
                  <option value="/my-pending-work">My Pending Tasks (/my-pending-work)</option>
                  <option value="/jobs">Job 360 (/jobs)</option>
                  <option value="/merchandising-bulk">Bulk Merchandising (/merchandising-bulk)</option>
                  <option value="/modules/dyeing">Dyeing Dashboard (/modules/dyeing)</option>
                  <option value="/modules/finished-fabric">Finished Fabric Store (/modules/finished-fabric)</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Recent Settings Change History" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {company.history.slice(0, 8).map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 10px',
                    background: 'var(--nos-inset)',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 'var(--fs-small)',
                  }}
                >
                  <div>
                    <Badge tone={h.scope === 'Company' ? 'info' : 'done'}>{h.scope}</Badge>
                    <span style={{ marginLeft: 8, fontWeight: 500 }}>{h.summary}</span>
                  </div>
                  <span style={{ color: 'var(--nos-ink-3)', fontSize: 'var(--fs-meta)' }}>
                    {h.by} · {fmtDate(h.at)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* A. COMPANY SETTINGS (ADMIN ONLY) */}
      {/* ===================================================================== */}
      {level === 'company' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Button
              size="sm"
              variant={companySubTab === 'masters' ? 'primary' : 'secondary'}
              onClick={() => setCompanySubTab('masters')}
            >
              1. Master Lists (11)
            </Button>
            <Button
              size="sm"
              variant={companySubTab === 'rules' ? 'primary' : 'secondary'}
              onClick={() => setCompanySubTab('rules')}
            >
              2. Rules & Targets
            </Button>
            <Button
              size="sm"
              variant={companySubTab === 'appearance' ? 'primary' : 'secondary'}
              onClick={() => setCompanySubTab('appearance')}
            >
              3. Default Appearance & Role Locks
            </Button>
            <Button
              size="sm"
              variant={companySubTab === 'users' ? 'primary' : 'secondary'}
              onClick={() => setCompanySubTab('users')}
            >
              4. Users & Access ({company.users.length})
            </Button>
            <Button
              size="sm"
              variant={companySubTab === 'history' ? 'primary' : 'secondary'}
              onClick={() => setCompanySubTab('history')}
            >
              5. Audit History ({company.history.length})
            </Button>
          </div>

          {companySubTab === 'masters' && (
            <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 12 }}>
              <Card title="Master Categories">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {MASTER_CATEGORIES.map((cat) => {
                    const count = (company.masters[cat.key] || []).length;
                    const active = activeMasterCat === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setActiveMasterCat(cat.key)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '7px 10px',
                          borderRadius: 'var(--r-sm)',
                          border: active ? '1px solid var(--nos-brand)' : '1px solid transparent',
                          background: active ? 'var(--nos-selected)' : 'transparent',
                          color: active ? 'var(--nos-brand)' : 'var(--nos-ink)',
                          fontWeight: active ? 600 : 500,
                          fontSize: 'var(--fs-small)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span>{cat.label}</span>
                        <Badge tone={active ? 'info' : 'quiet'}>{count}</Badge>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card
                title={MASTER_CATEGORIES.find((c) => c.key === activeMasterCat)?.label}
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setAddingMaster(true);
                      setSelectedMaster({
                        id: `m-${Date.now()}`,
                        name: '',
                        code: '',
                        meta: '',
                        active: true,
                        usedInJobsCount: 0,
                      });
                    }}
                  >
                    + Add Entry
                  </Button>
                }
              >
                <DataGrid
                  rows={masterRows}
                  columns={masterColumns}
                  rowKey={(r) => r.id}
                  frozenColumns={1}
                  storageKey={`settings-master-${activeMasterCat}`}
                  exportName={`master-${activeMasterCat}`}
                  onRowClick={(r) => {
                    setAddingMaster(false);
                    setSelectedMaster(r);
                  }}
                  selectedRowKey={selectedMaster?.id ?? null}
                />
              </Card>
            </div>
          )}

          {companySubTab === 'rules' && (
            <Card
              title="Plant Rules, Wastage & Targets"
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const next = saveCompanySettings(company, 'Updated plant rules and target thresholds');
                    setCompany(next);
                    show('Company rules and targets saved', 'ok');
                  }}
                >
                  Save Rules & Targets
                </Button>
              }
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Planning Slot Length (days)
                  </label>
                  <input
                    type="number"
                    className="nos-rp-input"
                    value={company.rules.planningSlotDays}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, planningSlotDays: Number(e.target.value) || 10 },
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Target RFT %
                  </label>
                  <input
                    type="number"
                    className="nos-rp-input"
                    value={company.rules.targetRftPct}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, targetRftPct: Number(e.target.value) || 95 },
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Target Sewing Efficiency %
                  </label>
                  <input
                    type="number"
                    className="nos-rp-input"
                    value={company.rules.targetEfficiencyPct}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, targetEfficiencyPct: Number(e.target.value) || 68 },
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Target On-Time Delivery %
                  </label>
                  <input
                    type="number"
                    className="nos-rp-input"
                    value={company.rules.targetOnTimePct}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, targetOnTimePct: Number(e.target.value) || 96 },
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Job Number Starting Value
                  </label>
                  <input
                    type="number"
                    className="nos-rp-input"
                    value={company.rules.jobNumberStartingValue}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, jobNumberStartingValue: Number(e.target.value) || 48000 },
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Default Cutting Excess %
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className="nos-rp-input"
                    value={company.rules.defaultCuttingExcessPct}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, defaultCuttingExcessPct: Number(e.target.value) || 2.5 },
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', fontWeight: 600, marginBottom: 4 }}>
                    Allowed Shipment Over/Under (±%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className="nos-rp-input"
                    value={company.rules.allowedShipmentTolerancePct}
                    onChange={(e) =>
                      setCompany((prev) => ({
                        ...prev,
                        rules: { ...prev.rules, allowedShipmentTolerancePct: Number(e.target.value) || 5 },
                      }))
                    }
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <strong style={{ fontSize: 'var(--fs-small)', display: 'block', marginBottom: 8 }}>
                  Default Fabric Wastage % by Fabric Item
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  {Object.entries(company.rules.defaultFabricWastagePct).map(([fab, pct]) => (
                    <div key={fab}>
                      <label style={{ display: 'block', fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)', marginBottom: 4 }}>
                        {fab} (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        className="nos-rp-input"
                        value={pct}
                        onChange={(e) =>
                          setCompany((prev) => ({
                            ...prev,
                            rules: {
                              ...prev.rules,
                              defaultFabricWastagePct: {
                                ...prev.rules.defaultFabricWastagePct,
                                [fab]: Number(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {companySubTab === 'appearance' && (
            <Card
              title="Company Default Appearance & Role Locks"
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const next = saveCompanySettings(company, 'Updated company default appearance and role locks');
                    setCompany(next);
                    show('Role appearance locks saved', 'ok');
                  }}
                >
                  Save Role Locks
                </Button>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {company.roleLocks.map((rl, idx) => (
                  <div
                    key={rl.roleOrDept}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '180px repeat(3, 150px) minmax(180px, 1fr)',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      background: 'var(--nos-inset)',
                      borderRadius: 'var(--r-sm)',
                    }}
                  >
                    <strong>{rl.roleOrDept}</strong>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small)' }}>
                      <input
                        type="checkbox"
                        checked={rl.lockTheme}
                        onChange={(e) => {
                          const next = [...company.roleLocks];
                          next[idx] = { ...rl, lockTheme: e.target.checked };
                          setCompany((p) => ({ ...p, roleLocks: next }));
                        }}
                      />
                      Lock Day/Night
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small)' }}>
                      <input
                        type="checkbox"
                        checked={rl.lockTableDensity}
                        onChange={(e) => {
                          const next = [...company.roleLocks];
                          next[idx] = { ...rl, lockTableDensity: e.target.checked };
                          setCompany((p) => ({ ...p, roleLocks: next }));
                        }}
                      />
                      Lock Row Density
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small)' }}>
                      <input
                        type="checkbox"
                        checked={rl.lockTextSize}
                        onChange={(e) => {
                          const next = [...company.roleLocks];
                          next[idx] = { ...rl, lockTextSize: e.target.checked };
                          setCompany((p) => ({ ...p, roleLocks: next }));
                        }}
                      />
                      Lock Text Size
                    </label>
                    <input
                      className="nos-rp-input"
                      value={rl.forcedStartPage || ''}
                      placeholder="Default start route (e.g. /modules/sewing)"
                      onChange={(e) => {
                        const next = [...company.roleLocks];
                        next[idx] = { ...rl, forcedStartPage: e.target.value };
                        setCompany((p) => ({ ...p, roleLocks: next }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {companySubTab === 'users' && (
            <Card
              title="Users, Roles & Buyer/Team Scope"
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setAddingUser(true);
                    setSelectedUser({
                      id: `usr-${Date.now()}`,
                      name: '',
                      email: '',
                      role: 'MERCHANDISER',
                      department: 'Sales & Merchandising',
                      buyerScope: 'ALL',
                      active: true,
                    });
                  }}
                >
                  + Add User Account
                </Button>
              }
            >
              <DataGrid
                rows={company.users}
                columns={userColumns}
                rowKey={(r) => r.id}
                frozenColumns={1}
                storageKey="settings-company-users"
                exportName="company-users"
                onRowClick={(r) => {
                  setAddingUser(false);
                  setSelectedUser(r);
                }}
                selectedRowKey={selectedUser?.id ?? null}
              />
            </Card>
          )}

          {companySubTab === 'history' && (
            <Card title="Audit Log — Who Changed What and When">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {company.history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--nos-inset)',
                      borderRadius: 'var(--r-sm)',
                    }}
                  >
                    <div>
                      <Badge tone={h.scope === 'Company' ? 'info' : 'done'}>{h.scope}</Badge>
                      <span style={{ marginLeft: 8, fontWeight: 500 }}>{h.summary}</span>
                    </div>
                    <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--nos-ink-3)' }}>
                      {h.by} · {fmtDate(h.at)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* RecordPanel for Master Item (never hard-delete if used in past jobs) */}
      <RecordPanel
        open={!!selectedMaster}
        onClose={() => setSelectedMaster(null)}
        title={addingMaster ? 'New Master Entry' : selectedMaster?.name || ''}
        subtitle={MASTER_CATEGORIES.find((c) => c.key === activeMasterCat)?.label}
        sections={
          selectedMaster
            ? [
                {
                  name: 'Master Record Details',
                  fields: [
                    { key: 'name', label: 'Name', value: selectedMaster.name, required: true },
                    { key: 'code', label: 'Code', value: selectedMaster.code || '' },
                    { key: 'meta', label: 'Details / Capacity / Rule', value: selectedMaster.meta || '', fullWidth: true },
                    {
                      key: 'active',
                      label: 'Status',
                      value: selectedMaster.active ? 'Active' : 'Turned Off',
                      type: 'status',
                      options: ['Active', 'Turned Off'],
                    },
                    {
                      key: 'usedInJobsCount',
                      label: 'Used in Past Jobs',
                      value: selectedMaster.usedInJobsCount ?? 0,
                      type: 'number',
                      readOnly: true,
                      setByRole: 'System (Never hard-delete if > 0)',
                    },
                  ],
                },
              ]
            : []
        }
        onSave={(vals) => {
          if (!selectedMaster) return;
          const updatedItem: MasterItem = {
            ...selectedMaster,
            name: String(vals.name || '').trim(),
            code: String(vals.code || '').trim(),
            meta: String(vals.meta || '').trim(),
            active: vals.active === 'Active',
          };
          const list = company.masters[activeMasterCat] || [];
          const nextList = addingMaster
            ? [updatedItem, ...list]
            : list.map((x) => (x.id === updatedItem.id ? updatedItem : x));
          const nextCompany = saveCompanySettings(
            {
              ...company,
              masters: { ...company.masters, [activeMasterCat]: nextList },
            },
            `${addingMaster ? 'Added' : 'Updated'} ${updatedItem.name} in ${activeMasterCat}`,
          );
          setCompany(nextCompany);
          setSelectedMaster(null);
          show(`Saved ${updatedItem.name}`, 'ok');
        }}
      />

      {/* RecordPanel for Company User Account */}
      <RecordPanel
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={addingUser ? 'New User Account' : selectedUser?.name || ''}
        subtitle={selectedUser ? `${selectedUser.role} · ${selectedUser.department}` : ''}
        sections={
          selectedUser
            ? [
                {
                  name: 'User Profile & Access Scope',
                  fields: [
                    { key: 'name', label: 'Full Name', value: selectedUser.name, required: true },
                    { key: 'email', label: 'Email', value: selectedUser.email, required: true },
                    {
                      key: 'role',
                      label: 'Role',
                      value: selectedUser.role,
                      type: 'select',
                      options: [
                        'DIRECTOR',
                        'ADMIN',
                        'HEAD_MERCHANDISER',
                        'MERCHANDISER',
                        'PLANNING_HEAD',
                        'LAB_HEAD',
                        'CAD_SPECIALIST',
                        'IE_SPECIALIST',
                        'STORE_OPERATOR',
                      ],
                    },
                    {
                      key: 'department',
                      label: 'Department',
                      value: selectedUser.department,
                      type: 'select',
                      options: [
                        'Management',
                        'Sales & Merchandising',
                        'Central Planning',
                        'Yarn Store & Knitting',
                        'Greige Fabric Store',
                        'Dyeing Lab',
                        'Dyeing',
                        'Testing Lab',
                        'Finished Fabric Store',
                        'CAD',
                        'Industrial Engineering',
                      ],
                    },
                    {
                      key: 'buyerScope',
                      label: 'Buyer / Team Scope',
                      value: selectedUser.buyerScope,
                      type: 'select',
                      options: ['ALL', 'ONLY', 'OVS', 'BS-NMT', 'BS-ONS', 'GT-MS', 'UTG'],
                    },
                    {
                      key: 'active',
                      label: 'Account Status',
                      value: selectedUser.active ? 'Active' : 'Disabled',
                      type: 'status',
                      options: ['Active', 'Disabled'],
                    },
                  ],
                },
              ]
            : []
        }
        onSave={(vals) => {
          if (!selectedUser) return;
          const nextUser: CompanyUserAccount = {
            ...selectedUser,
            name: String(vals.name || '').trim(),
            email: String(vals.email || '').trim(),
            role: String(vals.role || 'MERCHANDISER'),
            department: String(vals.department || 'Sales & Merchandising'),
            buyerScope: String(vals.buyerScope || 'ALL'),
            active: vals.active === 'Active',
          };
          const nextUsers = addingUser
            ? [nextUser, ...company.users]
            : company.users.map((u) => (u.id === nextUser.id ? nextUser : u));
          const nextCompany = saveCompanySettings(
            { ...company, users: nextUsers },
            `${addingUser ? 'Added' : 'Updated'} user ${nextUser.name} (${nextUser.role})`,
          );
          setCompany(nextCompany);
          setSelectedUser(null);
          show(`Saved user ${nextUser.name}`, 'ok');
        }}
        extraFooter={
          selectedUser && !addingUser ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => show(`Password reset link sent to ${selectedUser.email}`, 'info')}
            >
              Reset Password
            </Button>
          ) : null
        }
      />
    </Shell>
  );
}
