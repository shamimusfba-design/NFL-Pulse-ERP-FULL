// NOS Settings Store (docs/UX-STANDARD.md §5)
// Supports two levels: Company Settings (ADMIN only) and My Settings (per user account).
// TODO: Connect loadCompanySettings / saveCompanySettings and loadUserSettings / saveUserSettings to server API (/api/settings/company and /api/settings/me)

export interface MasterItem {
  id: string;
  name: string;
  code?: string;
  meta?: string;
  active: boolean;
  usedInJobsCount?: number;
}

export type MasterCategoryKey =
  | 'factories'
  | 'buyers'
  | 'merchandisers'
  | 'racks'
  | 'reasons'
  | 'finishingProcesses'
  | 'sampleTypes'
  | 'statuses'
  | 'units'
  | 'garmentPartsByItem'
  | 'commonTrimsByItem';

export interface CompanyRulesAndTargets {
  planningSlotDays: number;
  targetRftPct: number;
  targetEfficiencyPct: number;
  targetOnTimePct: number;
  jobNumberStartingValue: number;
  defaultFabricWastagePct: Record<string, number>;
  defaultCuttingExcessPct: number;
  allowedShipmentTolerancePct: number;
}

export type ElementSizeOption = 'Small' | 'Medium' | 'Large';

export interface UserAppearanceSettings {
  elementSizes: {
    pageTitle: ElementSizeOption;
    sectionHeading: ElementSizeOption;
    cardNumber: ElementSizeOption;
    tableHeader: ElementSizeOption;
    tableCell: ElementSizeOption;
    formLabel: ElementSizeOption;
    sidebar: ElementSizeOption;
    button: ElementSizeOption;
  };
  cardSize: 'Compact' | 'Standard' | 'Spacious';
  chartSize: 'Small (180px)' | 'Large (260px)';
  tableDensity: 'compact' | 'comfortable';
  theme: 'light' | 'dark';
  loginStartPage: string;
}

export interface RoleAppearanceLock {
  roleOrDept: string;
  lockTheme: boolean;
  lockTableDensity: boolean;
  lockTextSize: boolean;
  forcedStartPage?: string;
}

export interface CompanyUserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  buyerScope: string;
  active: boolean;
}

export interface SettingsHistoryRecord {
  id: string;
  at: string;
  by: string;
  scope: 'Company' | 'My Settings';
  summary: string;
}

export interface CompanySettingsData {
  masters: Record<MasterCategoryKey, MasterItem[]>;
  rules: CompanyRulesAndTargets;
  defaultAppearance: UserAppearanceSettings;
  roleLocks: RoleAppearanceLock[];
  users: CompanyUserAccount[];
  history: SettingsHistoryRecord[];
}

const COMPANY_SETTINGS_KEY = 'nos-company-settings-v1';
const USER_SETTINGS_PREFIX = 'nos-user-settings-v1-';

export const DEFAULT_USER_APPEARANCE: UserAppearanceSettings = {
  elementSizes: {
    pageTitle: 'Medium',
    sectionHeading: 'Medium',
    cardNumber: 'Medium',
    tableHeader: 'Medium',
    tableCell: 'Medium',
    formLabel: 'Medium',
    sidebar: 'Medium',
    button: 'Medium',
  },
  cardSize: 'Standard',
  chartSize: 'Small (180px)',
  tableDensity: 'comfortable',
  theme: 'light',
  loginStartPage: '/management',
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettingsData = {
  masters: {
    factories: [
      { id: 'fac-1', name: 'Northern Fashion Ltd. (NFL)', code: 'NFL', meta: 'Knitting 18T/day · Dyeing 15T/day · 22 Sewing Lines', active: true, usedInJobsCount: 1240 },
      { id: 'fac-2', name: 'Northern Clothing Ltd. (NCL)', code: 'NCL', meta: 'Knitting 10T/day · Dyeing 9T/day · 16 Sewing Lines', active: true, usedInJobsCount: 760 },
      { id: 'fac-3', name: 'Pakiza Dyeing & Printing (Sub-con)', code: 'PAK', meta: 'Dyeing & AOP 8T/day', active: true, usedInJobsCount: 145 },
      { id: 'fac-4', name: 'DBL Dyeing Complex (Sub-con)', code: 'DBL', meta: 'Dyeing 10T/day', active: true, usedInJobsCount: 98 },
      { id: 'fac-5', name: 'GMS Composite Knitting (Sub-con)', code: 'GMS', meta: 'Heavy Terry & Fleece 6T/day', active: true, usedInJobsCount: 64 },
    ],
    buyers: [
      { id: 'buy-1', name: 'ONLY', code: 'BS-ONL', meta: 'Sub-brands: ONL-JRSY, ONL-SWT, ONL-OSB, ONL-KIDS, ONL-PLAY, CARMAKOMA', active: true, usedInJobsCount: 612 },
      { id: 'buy-2', name: 'OVS', code: 'OVS', meta: 'Sub-brands: OVS Men, OVS Kids, OVS Ladies', active: true, usedInJobsCount: 384 },
      { id: 'buy-3', name: 'VERO MODA / NMT', code: 'BS-NMT', meta: 'Sub-brands: VM-JERSEY, NMT-CORE', active: true, usedInJobsCount: 410 },
      { id: 'buy-4', name: 'JACK & JONES / ONS', code: 'BS-ONS', meta: 'Sub-brands: JJ-CORE, ONS-KNIT', active: true, usedInJobsCount: 295 },
      { id: 'buy-5', name: 'Miss Selfridge / ASOS', code: 'GT-MS', meta: 'Sub-brands: MS-PETITE, MS-MAIN', active: true, usedInJobsCount: 180 },
      { id: 'buy-6', name: 'UTG / NEXT', code: 'UTG', meta: 'Sub-brands: UTG-LADIES, NEXT-DIRECT', active: true, usedInJobsCount: 119 },
    ],
    merchandisers: [
      { id: 'mer-1', name: 'Tariqul Islam', code: 'HEAD', meta: 'Head of Merchandising · All Buyers', active: true, usedInJobsCount: 2000 },
      { id: 'mer-2', name: 'Md. Imran', code: 'IMRAN', meta: 'Team ONLY · 61 Active Jobs', active: true, usedInJobsCount: 61 },
      { id: 'mer-3', name: 'Faisal Ahmed', code: 'FAISAL', meta: 'Team ONLY (Jersey & Sweat)', active: true, usedInJobsCount: 94 },
      { id: 'mer-4', name: 'Abid Hasan', code: 'ABID', meta: 'Team ONLY Bulk Follow-up', active: true, usedInJobsCount: 82 },
      { id: 'mer-5', name: 'Basir Hossain', code: 'BASIR', meta: 'Team OVS · 64 Active Jobs', active: true, usedInJobsCount: 64 },
    ],
    racks: [
      { id: 'rk-1', name: 'F.ST / Rack 01–15 (Bay A)', code: 'FST-A', meta: 'Finished Fabric Store · 90 Shelves', active: true, usedInJobsCount: 320 },
      { id: 'rk-2', name: 'F.ST / Rack 16–30 (Bay B)', code: 'FST-B', meta: 'Finished Fabric Store · 90 Shelves', active: true, usedInJobsCount: 280 },
      { id: 'rk-3', name: 'G.ST / Greige Bay 1–10', code: 'GST-1', meta: 'Greige Fabric Store · 120 Shelves', active: true, usedInJobsCount: 410 },
      { id: 'rk-4', name: 'Y.ST / Godown Lot Bins A–H', code: 'YST-A', meta: 'Yarn Store · Cone & Carton Racks', active: true, usedInJobsCount: 510 },
    ],
    reasons: [
      { id: 'rs-1', name: 'Yarn Count / Lot Shortage', code: 'NPT-YRN', meta: 'Delay / NPT Reason', active: true, usedInJobsCount: 38 },
      { id: 'rs-2', name: 'Shade Variation / Re-dyeing', code: 'REJ-SHD', meta: 'Rejection & Rework Reason', active: true, usedInJobsCount: 52 },
      { id: 'rs-3', name: 'Machine Breakdown / Needle Break', code: 'NPT-MCH', meta: 'NPT Reason', active: true, usedInJobsCount: 29 },
      { id: 'rs-4', name: 'Leftover End Bits After Marker Lay', code: 'RET-CUT', meta: 'Store Return Reason', active: true, usedInJobsCount: 84 },
      { id: 'rs-5', name: 'Trims / Print Approval Late', code: 'DLY-APP', meta: 'Delay Reason', active: true, usedInJobsCount: 41 },
    ],
    finishingProcesses: [
      { id: 'fp-1', name: 'AOP (All Over Print)', code: 'AOP', meta: 'Rotary / Flatbed Print Finishing', active: true, usedInJobsCount: 310 },
      { id: 'fp-2', name: 'Brush', code: 'BRUSH', meta: 'Fleece Back Raising & Brushing', active: true, usedInJobsCount: 265 },
      { id: 'fp-3', name: 'Peach', code: 'PEACH', meta: 'Carbon Peach Skin Finish', active: true, usedInJobsCount: 190 },
      { id: 'fp-4', name: 'Enzyme Wash', code: 'ENZYME', meta: 'Bio-polishing antipilling finish', active: true, usedInJobsCount: 480 },
      { id: 'fp-5', name: 'Silicone Softener', code: 'SILICONE', meta: 'Compacting & Softener Finish', active: true, usedInJobsCount: 620 },
    ],
    sampleTypes: [
      { id: 'st-1', name: 'Development / Proto', code: 'PROTO', meta: 'First development sample', active: true, usedInJobsCount: 420 },
      { id: 'st-2', name: 'Fit Sample', code: 'FIT', meta: 'Fit & measurement approval', active: true, usedInJobsCount: 310 },
      { id: 'st-3', name: 'SMS (Salesman Sample)', code: 'SMS', meta: 'Buyer showroom & sales sample', active: true, usedInJobsCount: 280 },
      { id: 'st-4', name: 'Size Set Sample', code: 'SIZESET', meta: 'Graded size set before bulk cutting', active: true, usedInJobsCount: 390 },
      { id: 'st-5', name: 'PP (Pre-Production / Gold Seal)', code: 'PP', meta: 'Final sealed sample before bulk', active: true, usedInJobsCount: 510 },
      { id: 'st-6', name: 'Shipment Sample', code: 'SHIP', meta: 'Final shipment reference sample', active: true, usedInJobsCount: 450 },
    ],
    statuses: [
      { id: 'sts-1', name: 'In Stock', code: 'IN_STOCK', meta: 'Store Stock Ready', active: true, usedInJobsCount: 840 },
      { id: 'sts-2', name: 'Partly Received', code: 'PART_RECV', meta: 'Balance Pending from Mill', active: true, usedInJobsCount: 420 },
      { id: 'sts-3', name: 'Waiting Dyeing', code: 'WAIT_DYE', meta: 'In Dyeing Queue', active: true, usedInJobsCount: 310 },
      { id: 'sts-4', name: 'Fully Issued', code: 'ISSUED', meta: 'Issued to Cutting / Floor', active: true, usedInJobsCount: 430 },
      { id: 'sts-5', name: 'T&A Crossed', code: 'TNA_LATE', meta: 'Milestone Date Passed', active: true, usedInJobsCount: 95 },
    ],
    units: [
      { id: 'u-1', name: 'Kilogram (kg)', code: 'kg', meta: 'Standard Yarn & Fabric Weight', active: true, usedInJobsCount: 2000 },
      { id: 'u-2', name: 'Metric Ton (t)', code: 't', meta: '1,000 kg Bulk Weight', active: true, usedInJobsCount: 2000 },
      { id: 'u-3', name: 'Pieces (pcs)', code: 'pcs', meta: 'Garment Quantity', active: true, usedInJobsCount: 2000 },
      { id: 'u-4', name: 'Dozen (dz)', code: 'dz', meta: '12 pcs Consumption & Trims Unit', active: true, usedInJobsCount: 1500 },
      { id: 'u-5', name: 'Yards (yds)', code: 'yds', meta: 'Marker Length & Elastic/Twill Tape', active: true, usedInJobsCount: 920 },
      { id: 'u-6', name: 'Meters (m)', code: 'm', meta: 'Sewing Thread & Zipper Length', active: true, usedInJobsCount: 810 },
      { id: 'u-7', name: 'Cone / Roll / Carton', code: 'roll', meta: 'Store Packaging Units', active: true, usedInJobsCount: 1650 },
    ],
    garmentPartsByItem: [
      { id: 'gp-1', name: 'T-Shirt / Top → Body (S/J), Neck Rib (1x1 Lycra Rib), Back Neck Tape (S/J)', code: 'TSHIRT', meta: 'Auto-suggests Body + Rib + Binding', active: true, usedInJobsCount: 980 },
      { id: 'gp-2', name: 'Hoodie / Sweatshirt → Body (Brush Fleece), Hood Lining (S/J), Cuff & Hem (2x2 Rib)', code: 'HOODIE', meta: 'Auto-suggests Fleece + S/J + 2x2 Rib', active: true, usedInJobsCount: 540 },
      { id: 'gp-3', name: 'Polo Shirt → Body (Pique), Collar & Cuff (Flat Knit Rib), Placket (S/J)', code: 'POLO', meta: 'Auto-suggests Pique + Collar/Cuff', active: true, usedInJobsCount: 310 },
      { id: 'gp-4', name: 'Jogger / Sweatpant → Body (Loopback Terry), Waistband (2x2 Lycra Rib), Pocket Bag (S/J)', code: 'JOGGER', meta: 'Auto-suggests Terry + Rib + Pocket S/J', active: true, usedInJobsCount: 170 },
    ],
    commonTrimsByItem: [
      { id: 'tr-1', name: 'T-Shirt Standard Pack → Main Label, Care Label, Size Label, Hangtag, Sewing Thread, Polybag, Export Carton', code: 'TRIM-TSHIRT', meta: 'Auto-ticked in Trims Checklist', active: true, usedInJobsCount: 980 },
      { id: 'tr-2', name: 'Hoodie / Sweat Pack → Main Label, Care Label, Drawcord, Metal Eyelet/Aglet, Twill Tape, Thread, Polybag, Carton', code: 'TRIM-HOODIE', meta: 'Auto-ticked in Trims Checklist', active: true, usedInJobsCount: 540 },
      { id: 'tr-3', name: 'Jogger Pack → Main Label, Care Label, Waist Elastic, Drawcord, Hangtag, Polybag, Carton', code: 'TRIM-JOGGER', meta: 'Auto-ticked in Trims Checklist', active: true, usedInJobsCount: 170 },
    ],
  },
  rules: {
    planningSlotDays: 10,
    targetRftPct: 95,
    targetEfficiencyPct: 68,
    targetOnTimePct: 96,
    jobNumberStartingValue: 48000,
    defaultFabricWastagePct: {
      'Single Jersey': 7,
      'Rib / Lycra Rib': 8,
      'Fleece / Brush': 9,
      'AOP Fabric': 11,
      'Yarn-Dyed Stripe': 10,
    },
    defaultCuttingExcessPct: 2.5,
    allowedShipmentTolerancePct: 5,
  },
  defaultAppearance: DEFAULT_USER_APPEARANCE,
  roleLocks: [
    { roleOrDept: 'MERCHANDISER', lockTheme: false, lockTableDensity: false, lockTextSize: false, forcedStartPage: '/merchandising-bulk' },
    { roleOrDept: 'STORE_OPERATOR', lockTheme: false, lockTableDensity: true, lockTextSize: false, forcedStartPage: '/modules/finished-fabric' },
    { roleOrDept: 'FLOOR_SUPERVISOR', lockTheme: true, lockTableDensity: true, lockTextSize: true, forcedStartPage: '/modules/sewing' },
  ],
  users: [
    { id: 'user-director', name: 'Managing Director / Factory Owner', email: 'md@northernfashion.com', role: 'DIRECTOR', department: 'Management', buyerScope: 'ALL', active: true },
    { id: 'user-head', name: 'Tariqul Islam', email: 'tariqul@northernfashion.com', role: 'HEAD_MERCHANDISER', department: 'Sales & Merchandising', buyerScope: 'ALL', active: true },
    { id: 'user-imran', name: 'Md. Imran', email: 'imran@northernfashion.com', role: 'MERCHANDISER', department: 'Sales & Merchandising', buyerScope: 'ONLY', active: true },
    { id: 'user-basir', name: 'Basir Hossain', email: 'basir@northernfashion.com', role: 'MERCHANDISER', department: 'Sales & Merchandising', buyerScope: 'OVS', active: true },
    { id: 'user-planning', name: 'Shahidul Alam', email: 'shahidul@northernfashion.com', role: 'PLANNING_HEAD', department: 'Central Planning', buyerScope: 'ALL', active: true },
    { id: 'user-lab', name: 'Dr. Nazrul Islam', email: 'nazrul@northernfashion.com', role: 'LAB_HEAD', department: 'Dyeing Lab', buyerScope: 'ALL', active: true },
    { id: 'user-cad', name: 'Rafiqul Islam', email: 'rafiqul@northernfashion.com', role: 'CAD_SPECIALIST', department: 'CAD', buyerScope: 'ALL', active: true },
    { id: 'user-ie', name: 'Engr. Kabir Hossain', email: 'kabir@northernfashion.com', role: 'IE_SPECIALIST', department: 'Industrial Engineering', buyerScope: 'ALL', active: true },
  ],
  history: [
    {
      id: 'sh-1',
      at: '2026-11-05T09:15:00Z',
      by: 'Tariqul Islam (Admin)',
      scope: 'Company',
      summary: 'Set Planning Slot length to 10 days, Target RFT to 95%, and Shipment Tolerance to ±5%',
    },
  ],
};

export function loadCompanySettings(): CompanySettingsData {
  if (typeof window === 'undefined') return DEFAULT_COMPANY_SETTINGS;
  try {
    const raw = localStorage.getItem(COMPANY_SETTINGS_KEY);
    if (!raw) return DEFAULT_COMPANY_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_COMPANY_SETTINGS,
      ...parsed,
      masters: { ...DEFAULT_COMPANY_SETTINGS.masters, ...(parsed.masters || {}) },
      rules: { ...DEFAULT_COMPANY_SETTINGS.rules, ...(parsed.rules || {}) },
    };
  } catch {
    return DEFAULT_COMPANY_SETTINGS;
  }
}

export function saveCompanySettings(next: CompanySettingsData, summary?: string, by = 'Admin'): CompanySettingsData {
  // TODO: POST /api/settings/company to persist company settings on server
  const updated: CompanySettingsData = {
    ...next,
    history: summary
      ? [
          {
            id: `sh-${Date.now()}`,
            at: new Date().toISOString(),
            by,
            scope: 'Company',
            summary,
          },
          ...(next.history || []),
        ]
      : next.history || [],
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

export function getActivePersonaKey(): string {
  if (typeof window === 'undefined') return 'user-head';
  try {
    return localStorage.getItem('nos-active-persona-id') || 'user-head';
  } catch {
    return 'user-head';
  }
}

export function loadUserSettings(userId?: string): UserAppearanceSettings {
  if (typeof window === 'undefined') return DEFAULT_USER_APPEARANCE;
  const uid = userId || getActivePersonaKey();
  try {
    const raw = localStorage.getItem(`${USER_SETTINGS_PREFIX}${uid}`);
    const theme = localStorage.getItem('nos-theme') === 'dark' ? 'dark' : 'light';
    if (!raw) return { ...DEFAULT_USER_APPEARANCE, theme };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_USER_APPEARANCE,
      ...parsed,
      elementSizes: { ...DEFAULT_USER_APPEARANCE.elementSizes, ...(parsed.elementSizes || {}) },
      theme,
    };
  } catch {
    return DEFAULT_USER_APPEARANCE;
  }
}

export function applyUserSettingsToDocument(settings: UserAppearanceSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.density = settings.tableDensity;

  const sizeScale = (opt: ElementSizeOption, basePx: number) =>
    opt === 'Small' ? `${basePx - 1}px` : opt === 'Large' ? `${basePx + 2}px` : `${basePx}px`;

  root.style.setProperty('--fs-h1', sizeScale(settings.elementSizes.pageTitle, 18));
  root.style.setProperty('--fs-h2', sizeScale(settings.elementSizes.sectionHeading, 14));
  root.style.setProperty('--fs-kpi', sizeScale(settings.elementSizes.cardNumber, 22));
  root.style.setProperty('--fs-body', sizeScale(settings.elementSizes.tableCell, 12.5));
  root.style.setProperty('--fs-small', sizeScale(settings.elementSizes.tableHeader, 11.5));
  root.style.setProperty('--fs-meta', sizeScale(settings.elementSizes.formLabel, 11));
}

export function saveUserSettings(
  settings: UserAppearanceSettings,
  userId?: string,
  summary = 'Updated personal display settings',
  by = 'Current User',
) {
  // TODO: PUT /api/settings/me to persist user settings on server across devices
  const uid = userId || getActivePersonaKey();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${USER_SETTINGS_PREFIX}${uid}`, JSON.stringify(settings));
      localStorage.setItem('nos-theme', settings.theme);
      applyUserSettingsToDocument(settings);
      const comp = loadCompanySettings();
      saveCompanySettings(comp, `[My Settings] ${summary}`, by);
    } catch {}
  }
}
