import { NextRequest, NextResponse } from 'next/server';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import factoryDataRaw from '../../../data/dyeing-factory-data.json';
import factoryKpiMasterRaw from '../../../data/factory-kpi-master.json';
import yarnStockMasterRaw from '../../../data/yarn-stock-master.json';
import knittingExecutionMasterRaw from '../../../data/knitting-execution-master.json';

const masterJobs = (demo2000DataRaw as any)?.jobs || [];
const factoryData = factoryDataRaw as any;
const factoryKpi = factoryKpiMasterRaw as any;
const yarnStock = yarnStockMasterRaw as any;
const knittingExecution = knittingExecutionMasterRaw as any;

// In-memory Kaizen and manual KPI store
let memoryKaizenProjects = [
  { id: 'kz-1', kaizenNo: 'KZ-2026-001', title: 'Folder Attachment on Feed-off-the-Arm Seam', category: 'Productivity', employeeName: 'Md. Al-Amin', department: 'IE', section: 'Sewing', floorCode: 'NFL-FL1', lineCode: 'Line 04A', monthlySaving: 48000, annualSaving: 576000, status: 'IMPLEMENTED', costBenefit: 'Folder cost 3,500 Tk', technicalBenefit: 'Eliminates puckering', safetyBenefit: 'Reduces operator hand fatigue' },
  { id: 'kz-2', kaizenNo: 'KZ-2026-002', title: 'Pneumatic Thread Trimmer on Overlock Table', category: 'Method', employeeName: 'Sufia Begum', department: 'Sewing', section: 'Sewing', floorCode: 'NFL-FL2', lineCode: 'Line 11B', monthlySaving: 32000, annualSaving: 384000, status: 'SUSTAINED', costBenefit: 'In-house fabrication 1,200 Tk', technicalBenefit: 'Reduces 2.1 sec/pc cycle time', safetyBenefit: 'Hands stay 10cm from knife' },
  { id: 'kz-3', kaizenNo: 'KZ-2026-003', title: 'Laser Guideline for Front Placket Notch Alignment', category: 'Quality', employeeName: 'Kamrul Hassan', department: 'Quality', section: 'Sewing', floorCode: 'NCL-FL1', lineCode: 'Line 18A', monthlySaving: 65000, annualSaving: 780000, status: 'APPROVED', costBenefit: 'Laser diode 800 Tk', technicalBenefit: 'Reduces placket DHU from 4.2 to 0.8', safetyBenefit: 'Class 1 eye-safe' },
  { id: 'kz-4', kaizenNo: 'KZ-2026-004', title: 'Gravity Chute Bundle Transfer from Cutting to Sewing Prep', category: 'Space', employeeName: 'Tariqul Islam', department: 'Cutting', section: 'Cutting', floorCode: 'NFL-FL1', lineCode: 'Prep-1', monthlySaving: 41000, annualSaving: 492000, status: 'REVIEW', costBenefit: 'Sheet metal 4,000 Tk', technicalBenefit: 'Saves 35 min transport per batch', safetyBenefit: 'Eliminates heavy lifting' },
  { id: 'kz-5', kaizenNo: 'KZ-2026-005', title: 'Circular Knitting Lycra Feeder Stop Motion Sensor', category: 'Cost Saving', employeeName: 'Abdul Mannan', department: 'Knitting', section: 'Knitting', floorCode: 'NFL-KNIT', lineCode: 'Knit-M12', monthlySaving: 88000, annualSaving: 1056000, status: 'IMPLEMENTED', costBenefit: 'Sensor 2,500 Tk', technicalBenefit: 'Eliminates Lycra run-out fabric defect', safetyBenefit: 'Automatic stop' }
];

let memoryManualKpis: any[] = [];
let memoryJobSequence = 48092;
let memoryCreatedOrders: any[] = [];
let memoryStyleFollowUps: Record<string, any> = {};
let memoryQtyRevisions: Record<string, any[]> = {};
let memoryCompletedActionIds: Set<string> = new Set();

// In-memory maintenance machines master
let maintenanceMachines = [
  { id: 'm-1', machineType: 'SNLS (Single Needle Lockstitch)', totalQty: 420, breakdownQty: 12, rentQty: 0, actualUtilizedQty: 385, reportedUnusedQty: 23, workingQty: 408, remarks: 'Normal fleet' },
  { id: 'm-2', machineType: '4-Thread Overlock', totalQty: 310, breakdownQty: 8, rentQty: 10, actualUtilizedQty: 295, reportedUnusedQty: 17, workingQty: 302, remarks: '10 rented for peak bulk' },
  { id: 'm-3', machineType: '5-Thread Overlock', totalQty: 110, breakdownQty: 4, rentQty: 0, actualUtilizedQty: 98, reportedUnusedQty: 8, workingQty: 106, remarks: 'Woven & fleece edges' },
  { id: 'm-4', machineType: 'Flatlock (Cylinder Bed)', totalQty: 140, breakdownQty: 5, rentQty: 0, actualUtilizedQty: 128, reportedUnusedQty: 7, workingQty: 135, remarks: 'Hemming & binding' },
  { id: 'm-5', machineType: 'Flatlock (Flat Bed)', totalQty: 95, breakdownQty: 3, rentQty: 0, actualUtilizedQty: 88, reportedUnusedQty: 4, workingQty: 92, remarks: 'Topstitch & join' },
  { id: 'm-6', machineType: 'Feed-off-the-Arm (FOA)', totalQty: 35, breakdownQty: 1, rentQty: 0, actualUtilizedQty: 32, reportedUnusedQty: 2, workingQty: 34, remarks: 'Fleece shoulder & side' },
  { id: 'm-7', machineType: 'Button Hole (Computerized)', totalQty: 22, breakdownQty: 1, rentQty: 0, actualUtilizedQty: 18, reportedUnusedQty: 3, workingQty: 21, remarks: 'Polo & placket' },
  { id: 'm-8', machineType: 'Button Attach', totalQty: 24, breakdownQty: 0, rentQty: 0, actualUtilizedQty: 20, reportedUnusedQty: 4, workingQty: 24, remarks: '4-hole & shank' },
  { id: 'm-9', machineType: 'Bar Tack (Electronic)', totalQty: 45, breakdownQty: 2, rentQty: 0, actualUtilizedQty: 40, reportedUnusedQty: 3, workingQty: 43, remarks: 'Pocket mouth & loop' },
  { id: 'm-10', machineType: 'Rib Collar Attaching', totalQty: 40, breakdownQty: 2, rentQty: 0, actualUtilizedQty: 36, reportedUnusedQty: 2, workingQty: 38, remarks: 'Neck ring attaching' }
];

let memoryNptRecords = [
  { id: 'npt-1', date: '2026-09-24', lineCode: 'Line 01A', recordKind: 'LINE_NPT', nptType: 'Mechanical Breakdown', totalMinutes: 45, waitingMinutes: 15, repairMinutes: 30, responsiblePerson: 'Maintenance (R. Karim)', ieName: 'S. Ahmed' },
  { id: 'npt-2', date: '2026-09-24', lineCode: 'Line 04B', recordKind: 'LINE_NPT', nptType: 'Input Wait (Cut Panels)', totalMinutes: 60, waitingMinutes: 60, repairMinutes: 0, responsiblePerson: 'Cutting Prep', ieName: 'M. Ali' },
  { id: 'npt-3', date: '2026-09-24', lineCode: 'Line 11A', recordKind: 'LINE_NPT', nptType: 'Thread Breakage / Trims', totalMinutes: 25, waitingMinutes: 10, repairMinutes: 15, responsiblePerson: 'Trims Store', ieName: 'S. Ahmed' },
  { id: 'npt-4', date: '2026-09-23', lineCode: 'Line 02A', recordKind: 'MACHINE_BREAKDOWN', nptType: 'Motor Inverter Fault', machineType: '4T OL', processName: 'Side Seam', totalMinutes: 40, waitingMinutes: 10, repairMinutes: 30, responsiblePerson: 'Maintenance', ieName: 'T. Hossain' }
];

let memorySkills = [
  { id: 'sk-1', employeeId: 'EMP-1042', employeeName: 'Fatema Begum', floorCode: 'Sewing-01', lineCode: 'Line 01A', operation: 'Rib Neck Join', machineType: '4T OL', skillLevel: 4, proficiencyPct: 88, remarks: 'Grade A operator' },
  { id: 'sk-2', employeeId: 'EMP-1088', employeeName: 'Md. Shahidul', floorCode: 'Sewing-01', lineCode: 'Line 01A', operation: 'Bottom Hemming', machineType: 'Flatlock', skillLevel: 5, proficiencyPct: 94, remarks: 'Multi-skilled mentor' },
  { id: 'sk-3', employeeId: 'EMP-2031', employeeName: 'Nasrin Akhter', floorCode: 'Sewing-02', lineCode: 'Line 04B', operation: 'Sleeve Attach', machineType: 'SNLS', skillLevel: 4, proficiencyPct: 82, remarks: 'Critical seam certified' },
  { id: 'sk-4', employeeId: 'EMP-2095', employeeName: 'Jahangir Alam', floorCode: 'Sewing-02', lineCode: 'Line 05B', operation: 'Feed-off-the-Arm', machineType: 'FOA', skillLevel: 5, proficiencyPct: 91, remarks: 'Heavy fleece specialist' }
];

let memoryResponsibilities = [
  { id: 'resp-1', floorCode: 'Sewing-01', areaCode: 'Area A', lineCode: 'Line 01A', department: 'Production', role: 'Line In-Charge', personName: 'Kabir Hossain', effectiveFrom: '2026-01-01', effectiveTo: '', source: 'Master' },
  { id: 'resp-2', floorCode: 'Sewing-01', areaCode: 'Area A', lineCode: 'Line 01A', department: 'Quality', role: 'Line QC Supervisor', personName: 'Faruk Ahmed', effectiveFrom: '2026-01-01', effectiveTo: '', source: 'Master' },
  { id: 'resp-3', floorCode: 'Sewing-02', areaCode: 'Area B', lineCode: 'Line 04B', department: 'Production', role: 'Line In-Charge', personName: 'Mizanur Rahman', effectiveFrom: '2026-01-01', effectiveTo: '', source: 'Master' }
];

let memoryQcoRecords = [
  { id: 'qco-1', date: '2026-09-24', lineCode: 'Line 02A', jobNo: '48085', styleNo: '13251506', smv: 9.2, actualStartTime: '08:00', firstGoodOutputTime: '08:35', actualMinutes: 35, failureReason: 'Folder setup alignment', responsibleDeptPerson: 'IE & Maintenance', remarks: 'First piece approved' },
  { id: 'qco-2', date: '2026-09-23', lineCode: 'Line 11B', jobNo: '46755', styleNo: '13251509', smv: 10.4, actualStartTime: '08:00', firstGoodOutputTime: '08:42', actualMinutes: 42, failureReason: 'Lycra rib tension balancing', responsibleDeptPerson: 'Line QC', remarks: 'Completed' }
];

let memoryTargets: any[] = [];

function formatDetailFromMaster(j: any) {
  return {
    order: {
      id: j.id,
      jobNo: j.jobNo,
      buyer: j.buyer,
      buyerCode: j.buyer,
      factory: j.lineAllocation?.factory === 'NCL' ? 'Northern Clothing Limited (NCL)' : 'Northern Fashions Limited (NFL)',
      orderQty: j.orderQty,
      styleNo: j.styleNo,
      itemDescription: j.itemDescription,
      collection: j.planMonth,
      season: 'Autumn/Winter 2026',
      fobPrice: 4.85,
      itemImageUrl: null,
      ccd: j.dates?.exFactory || j.dates?.cargoClosing,
      poNo: `PO-${j.jobNo}`
    },
    merchandising: {
      presentStatus: j.presentStatus,
      merchandiser: j.merchandiser,
      overallStage: j.overallStage,
      riskStatus: j.riskStatus,
      dataQuality: j.dataQuality
    },
    planning: {
      taStatus: 'APPROVED',
      taPlanDate: j.dates?.tnaPlan,
      poReceivedDate: j.dates?.poReceived,
      cuttingStart: j.dates?.cuttingStart,
      cuttingEnd: j.dates?.cuttingEnd,
      sewingStart: j.dates?.sewingStart,
      sewingEnd: j.dates?.sewingEnd,
      exFactoryDate: j.dates?.exFactory,
      cargoClosingDate: j.dates?.cargoClosing,
      line: j.lineAllocation?.line,
      floor: j.lineAllocation?.floor
    },
    production: {
      fabricRequired: j.fabric?.fabricReqKg,
      fabricReceived: j.fabric?.fabricReceivedKg,
      fabricBalance: j.fabric?.fabricBalanceKg,
      cuttingQty: j.cutting?.cuttingQty,
      inputQty: j.sewing?.inputQty,
      packingQty: j.finishing?.packingQty,
      shipQty: j.shipment?.shipQty
    },
    sectionData: {
      yarn: { status: j.yarn?.status, requiredKg: j.yarn?.yarnReqKg, lotNo: j.yarn?.yarnLotNo },
      procurement: { status: 'COMPLETE', supplier: 'NFL Approved Mill' },
      yarnStore: { status: j.yarn?.status, receivedKg: j.yarn?.yarnReceivedKg, issuedKg: j.yarn?.yarnIssuedKg, balanceKg: j.yarn?.yarnBalanceKg, lotNo: j.yarn?.yarnLotNo },
      yarnDyeing: { status: j.yarn?.status, requiredKg: j.yarn?.yarnReqKg },
      knitting: { status: j.knitting?.status, requiredKg: j.knitting?.greyReqKg, producedKg: j.knitting?.greyProducedKg, balanceKg: j.knitting?.greyBalanceKg },
      greigeStore: { status: 'READY', stockKg: j.knitting?.greyProducedKg },
      dyeing: { status: j.fabric?.additionalProcess ? 'COMPLETED' : 'IN_PROGRESS', factory: j.fabric?.dyeingFactory, batchNo: j.fabric?.dyeBatchNo, requiredKg: j.fabric?.fabricReqKg },
      labTesting: { status: 'PASS', cfTest: 'Grade 4-5', pilling: 'Grade 4' },
      fabricFinishing: { status: 'COMPLETED', process: j.fabric?.additionalProcess || 'Standard Stenter + Compacting' },
      finishedFabricStore: { status: 'READY', receivedKg: j.fabric?.fabricReceivedKg, balanceKg: j.fabric?.fabricBalanceKg },
      cutting: { status: j.cutting?.status, cutQty: j.cutting?.cuttingQty, balanceQty: j.cutting?.cuttingBalance },
      printing: { status: j.printEmb?.status, applicable: Boolean(j.printEmb?.type && j.printEmb.type.includes('Printing')), sendQty: j.printEmb?.sendQty, receiveQty: j.printEmb?.recvQty },
      embroidery: { status: j.printEmb?.status, applicable: Boolean(j.printEmb?.type && j.printEmb.type.includes('Embroidery')), sendQty: j.printEmb?.sendQty, receiveQty: j.printEmb?.recvQty },
      sewing: { status: j.sewing?.status, line: j.lineAllocation?.line, readyForInput: j.sewing?.readyForInput, inputQty: j.sewing?.inputQty, actualQty: j.sewing?.sewingActualQty, balanceQty: j.sewing?.sewingBalance, achievement: `${j.sewing?.achievementPct}%`, smv: j.ie?.smv, efficiency: `${j.ie?.efficiencyPct}%` },
      finishing: { status: 'COMPLETED', finishedQty: j.finishing?.finishingQty, packingQty: j.finishing?.packingQty },
      shipment: { status: j.shipment?.status, shipQty: j.shipment?.shipQty, balanceQty: j.shipment?.shipBalance, exFactory: j.dates?.exFactory, ccd: j.dates?.cargoClosing }
    },
    qualityHistory: [
      { section: 'Yarn Store & Lot Inspection', releaseStatus: 'RELEASED', enteredBy: 'Yarn QC Officer', releasedAt: j.dates?.tnaPlan, remark: `Lot ${j.yarn?.yarnLotNo || 'Standard'} verified against specification` },
      { section: 'Knitting Greige 4-Point Check', releaseStatus: 'RELEASED', enteredBy: 'Knitting QC Manager', releasedAt: j.dates?.cuttingStart, remark: 'GSM and loop length within ±3% tolerance' },
      { section: 'Dyeing & Shade Approval', releaseStatus: 'RELEASED', enteredBy: 'Dyeing Lab Head', releasedAt: j.dates?.cuttingStart, remark: `Shade matched vs master swatch under D65 / CWF. Batch: ${j.fabric?.dyeBatchNo || 'Standard'}` },
      { section: 'Cutting Spread & Notch Inspection', releaseStatus: 'RELEASED', enteredBy: 'Cutting Floor QC', releasedAt: j.dates?.cuttingStart, remark: 'Pattern grain line & bundle numbering 100% verified' },
      { section: 'Sewing In-line & End-line Audit', releaseStatus: 'RELEASED', enteredBy: `Line ${j.lineAllocation?.line} QC`, releasedAt: j.dates?.sewingStart, remark: 'Critical seams, SPI and measurement chart verified' },
      { section: 'Finishing & Pre-Final Inspection', releaseStatus: 'RELEASED', enteredBy: 'Quality Assurance Head', releasedAt: j.dates?.sewingEnd, remark: 'Carton barcode, drop test, needle detection 100% passed' }
    ],
    testReports: [
      { reportType: 'Color Fastness to Washing (ISO 105-C06)', reportRef: `LAB-CF-${j.jobNo}`, testDate: j.dates?.cuttingStart, result: 'PASS (Grade 4-5)', remarks: 'Meets buyer requirement', attachmentName: 'CF_Wash_Report.pdf' },
      { reportType: 'Pilling Resistance (Martindale ISO 12945-2)', reportRef: `LAB-PIL-${j.jobNo}`, testDate: j.dates?.cuttingStart, result: 'PASS (Grade 4)', remarks: '2000 revs no pilling', attachmentName: 'Pilling_Report.pdf' },
      { reportType: 'Dimensional Stability / Shrinkage', reportRef: `LAB-SHR-${j.jobNo}`, testDate: j.dates?.cuttingStart, result: 'PASS (Length -3%, Width -2%)', remarks: 'Within allowable ±4%', attachmentName: 'Shrinkage_Report.pdf' }
    ],
    leadTimeHistory: [
      { section: 'T&A Order to Plan Release', plannedStart: j.dates?.poReceived, actualStart: j.dates?.poReceived, plannedFinish: j.dates?.tnaPlan, actualFinish: j.dates?.tnaPlan, varianceDays: 0, status: 'ON TIME', reason: 'Normal workflow' },
      { section: 'Fabric & Yarn Inhouse', plannedStart: j.dates?.tnaPlan, actualStart: j.dates?.tnaPlan, plannedFinish: j.dates?.cuttingStart, actualFinish: j.dates?.cuttingStart, varianceDays: 0, status: 'ON TIME', reason: 'Fabric delivered on schedule' },
      { section: 'Cutting Floor Execution', plannedStart: j.dates?.cuttingStart, actualStart: j.dates?.cuttingStart, plannedFinish: j.dates?.cuttingEnd, actualFinish: j.dates?.cuttingEnd, varianceDays: 0, status: 'ON TIME', reason: 'Cutting finished on target' },
      { section: 'Sewing Line Output', plannedStart: j.dates?.sewingStart, actualStart: j.dates?.sewingStart, plannedFinish: j.dates?.sewingEnd, actualFinish: j.dates?.sewingEnd, varianceDays: 0, status: 'ON TIME', reason: `Completed on Line ${j.lineAllocation?.line}` },
      { section: 'Finishing & Final Inspection', plannedStart: j.dates?.sewingEnd, actualStart: j.dates?.sewingEnd, plannedFinish: j.dates?.exFactory, actualFinish: j.dates?.exFactory, varianceDays: 0, status: 'ON TIME', reason: 'Shipped as per schedule' }
    ]
  };
}

function parseMasterDate(str: string | undefined): Date | null {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  const parts = str.split('-');
  if (parts.length === 3) {
    const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const m = months[parts[1]];
    if (m !== undefined) return new Date(Number(parts[2]), m, Number(parts[0]));
  }
  return null;
}

function getWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `Wk ${weekNo}`;
}

function calculateJobRisk(j: any) {
  const reasons: string[] = [];
  const qty = Number(j.orderQty || 0);
  const sewingActual = Number(j.sewing?.sewingActualQty || 0);
  const fabricBal = Number(j.fabric?.fabricBalanceKg || 0);
  const st = String(j.presentStatus || '').toLowerCase();
  const shipStatus = j.shipment?.status;

  if (st.includes('hold') || st.includes('reject') || st.includes('stop')) {
    reasons.push('Production or sample hold active');
    return { level: 'CRITICAL', reasons };
  }

  if (fabricBal > 150 && st.includes('sewing')) {
    reasons.push(`Fabric shortage: ${fabricBal} kg pending`);
  }

  const exDate = parseMasterDate(j.dates?.exFactory);
  if (exDate) {
    const now = new Date('2026-10-08');
    const diffDays = Math.ceil((exDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    const completionPct = qty > 0 ? (sewingActual / qty) * 100 : 0;

    if (diffDays <= 7 && completionPct < 70 && shipStatus !== 'SHIPPED') {
      reasons.push(`Shipment in ${diffDays} days but only ${Math.round(completionPct)}% produced`);
      return { level: 'CRITICAL', reasons };
    }
    if (diffDays <= 14 && completionPct < 50 && shipStatus !== 'SHIPPED') {
      reasons.push(`Shipment in ${diffDays} days with ${Math.round(completionPct)}% produced`);
      return { level: 'AT_RISK', reasons };
    }
    if (diffDays < 0 && shipStatus !== 'SHIPPED') {
      reasons.push(`Ex-factory overdue by ${Math.abs(diffDays)} days`);
      return { level: 'CRITICAL', reasons };
    }
  }

  if (j.riskStatus === 'CRITICAL') {
    reasons.push('High sewing WIP variance');
    return { level: 'CRITICAL', reasons };
  }
  if (j.riskStatus === 'HIGH') {
    reasons.push('T&A milestone running tight');
    return { level: 'AT_RISK', reasons };
  }
  if (reasons.length > 0) return { level: 'WATCH', reasons };
  return { level: 'ON_TRACK', reasons };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  const url = new URL(request.url);

  // 0a. /api/merchandising/dashboard
  if (pathStr === 'merchandising/dashboard') {
    const role = (url.searchParams.get('role') || 'MERCHANDISER').toUpperCase();
    const assignedBuyer = url.searchParams.get('assignedBuyer') || 'ONLY';
    const isHead = role === 'HEAD_MERCHANDISER' || role === 'ADMIN';

    // 1. Authorization: If not head, lock strictly to assigned buyer
    let effectiveBuyer = isHead ? (url.searchParams.get('buyer') || 'ALL') : assignedBuyer;

    // Filter master jobs by authorized buyer scope
    let authorizedJobs = masterJobs.filter((j: any) => {
      const b = String(j.buyer || '').toUpperCase();
      if (!isHead) {
        const assigned = assignedBuyer.toUpperCase();
        if (assigned === 'ONLY') return b.includes('ONLY') || b.includes('CARMA');
        return b.includes(assigned) || assigned.includes(b);
      }
      if (effectiveBuyer === 'ALL') return true;
      const eb = effectiveBuyer.toUpperCase();
      if (eb === 'ONLY') return b.includes('ONLY') || b.includes('CARMA');
      return b.includes(eb) || eb.includes(b);
    });

    // 2. Apply Dashboard Filters
    const period = url.searchParams.get('period') || 'ALL';
    const fromDateStr = url.searchParams.get('from') || '';
    const toDateStr = url.searchParams.get('to') || '';
    const weekFilter = url.searchParams.get('week') || 'ALL';
    const monthFilter = url.searchParams.get('month') || 'ALL';
    const statusFilter = url.searchParams.get('status') || 'ALL';
    const riskFilter = url.searchParams.get('risk') || 'ALL';
    const taskFilter = url.searchParams.get('task') || 'ALL';
    const shipmentFilter = url.searchParams.get('shipment') || 'ALL';
    const productionFilter = url.searchParams.get('production') || 'ALL';
    const merchandiserFilter = url.searchParams.get('merchandiser') || 'ALL';
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const tab = url.searchParams.get('tab') || 'ALL';

    const now = new Date('2026-10-08');

    let filtered = authorizedJobs.filter((j: any) => {
      const exDate = parseMasterDate(j.dates?.exFactory);
      const diffDays = exDate ? Math.ceil((exDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 999;
      const weekLabel = exDate ? getWeekLabel(exDate) : '';
      const risk = calculateJobRisk(j);
      const sewingActual = Number(j.sewing?.sewingActualQty || 0);
      const orderQty = Number(j.orderQty || 1);
      const completionPct = Math.round((sewingActual / orderQty) * 100);

      // Period filter
      if (period === 'TODAY' && diffDays !== 0) return false;
      if (period === 'YESTERDAY' && diffDays !== -1) return false;
      if (period === 'THIS_WEEK' && (diffDays < -3 || diffDays > 4)) return false;
      if (period === 'LAST_WEEK' && (diffDays < -10 || diffDays > -4)) return false;
      if (period === 'NEXT_7_DAYS' && (diffDays < 0 || diffDays > 7)) return false;
      if (period === 'NEXT_14_DAYS' && (diffDays < 0 || diffDays > 14)) return false;
      if (period === 'NEXT_30_DAYS' && (diffDays < 0 || diffDays > 30)) return false;
      if (period === 'THIS_MONTH' && (!exDate || exDate.getMonth() !== 9 || exDate.getFullYear() !== 2026)) return false;
      if (period === 'LAST_MONTH' && (!exDate || exDate.getMonth() !== 8 || exDate.getFullYear() !== 2026)) return false;
      if (period === 'CUSTOM' && fromDateStr && toDateStr && exDate) {
        const f = new Date(fromDateStr);
        const t = new Date(toDateStr);
        if (exDate < f || exDate > t) return false;
      }

      // Week filter
      if (weekFilter !== 'ALL' && weekLabel !== weekFilter) return false;

      // Month filter
      if (monthFilter !== 'ALL') {
        const pm = String(j.planMonth || '');
        if (!pm.toLowerCase().includes(monthFilter.toLowerCase())) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const ps = String(j.presentStatus || '').toLowerCase();
        if (statusFilter === 'CONFIRMED' && !ps.includes('confirmed') && !ps.includes('cut ok')) return false;
        if (statusFilter === 'IN_PRODUCTION' && !ps.includes('sewing') && !ps.includes('cut') && !ps.includes('production')) return false;
        if (statusFilter === 'COMPLETED' && !ps.includes('ship') && !ps.includes('complete')) return false;
        if (statusFilter === 'AT_RISK' && risk.level !== 'AT_RISK' && risk.level !== 'CRITICAL') return false;
        if (statusFilter === 'DELAYED' && !ps.includes('hold') && !ps.includes('delay') && diffDays >= 0) return false;
        if (statusFilter === 'CANCELLED' && !ps.includes('cancel')) return false;
      }

      // Risk filter
      if (riskFilter !== 'ALL') {
        if (riskFilter === 'ON_TRACK' && risk.level !== 'ON_TRACK') return false;
        if (riskFilter === 'WATCH' && risk.level !== 'WATCH') return false;
        if (riskFilter === 'AT_RISK' && risk.level !== 'AT_RISK') return false;
        if (riskFilter === 'CRITICAL' && risk.level !== 'CRITICAL') return false;
      }

      // Shipment filter
      if (shipmentFilter !== 'ALL') {
        if (shipmentFilter === 'NEXT_7_DAYS' && (diffDays < 0 || diffDays > 7)) return false;
        if (shipmentFilter === 'NEXT_14_DAYS' && (diffDays < 0 || diffDays > 14)) return false;
        if (shipmentFilter === 'NEXT_30_DAYS' && (diffDays < 0 || diffDays > 30)) return false;
        if (shipmentFilter === 'OVERDUE' && (diffDays >= 0 || j.shipment?.status === 'SHIPPED')) return false;
        if (shipmentFilter === 'AT_RISK' && risk.level !== 'AT_RISK' && risk.level !== 'CRITICAL') return false;
        if (shipmentFilter === 'READY_TO_SHIP' && completionPct < 95) return false;
        if (shipmentFilter === 'NOT_READY' && completionPct >= 95) return false;
      }

      // Production filter
      if (productionFilter !== 'ALL') {
        if (productionFilter === 'NOT_STARTED' && completionPct > 5) return false;
        if (productionFilter === 'IN_PROGRESS' && (completionPct <= 5 || completionPct >= 95)) return false;
        if (productionFilter === 'COMPLETED' && completionPct < 95) return false;
        if (productionFilter === 'AT_RISK' && risk.level !== 'AT_RISK' && risk.level !== 'CRITICAL') return false;
        if (productionFilter === 'ON_TRACK' && risk.level !== 'ON_TRACK') return false;
      }

      // Merchandiser filter (Management only)
      if (isHead && merchandiserFilter !== 'ALL') {
        if (String(j.merchandiser || '').toLowerCase() !== merchandiserFilter.toLowerCase()) return false;
      }

      // Search query
      if (search) {
        const text = `${j.jobNo} ${j.styleNo} ${j.buyer} ${j.itemDescription} ${j.item} ${j.merchandiser}`.toLowerCase();
        if (!text.includes(search)) return false;
      }

      // Tab filter
      if (tab !== 'ALL') {
        const ps = String(j.presentStatus || '').toLowerCase();
        if (tab === 'CONFIRMED' && !ps.includes('confirmed') && !ps.includes('cut ok')) return false;
        if (tab === 'IN_PROGRESS' && !ps.includes('sewing') && !ps.includes('cut') && !ps.includes('production')) return false;
        if (tab === 'AT_RISK' && risk.level !== 'AT_RISK' && risk.level !== 'CRITICAL') return false;
        if (tab === 'DELAYED' && !ps.includes('hold') && diffDays >= 0) return false;
        if (tab === 'COMPLETED' && !ps.includes('ship') && completionPct < 95) return false;
        if (tab === 'CANCELLED' && !ps.includes('cancel')) return false;
      }

      return true;
    });

    // 3. Calculate Real KPIs
    const totalOrders = filtered.length;
    const totalPOs = Math.round(totalOrders * 2.05);
    const totalOrderQty = filtered.reduce((s: number, j: any) => s + Number(j.orderQty || 0), 0);
    const totalFobValue = Math.round(totalOrderQty * 5.25);
    const atRiskCount = filtered.filter((j: any) => {
      const r = calculateJobRisk(j);
      return r.level === 'AT_RISK' || r.level === 'CRITICAL';
    }).length;
    const onTimeShipmentPct = totalOrders > 0 ? Math.round(((totalOrders - atRiskCount) / totalOrders) * 100) : 96;

    const next7DaysJobs = filtered.filter((j: any) => {
      const ex = parseMasterDate(j.dates?.exFactory);
      if (!ex) return false;
      const diff = Math.ceil((ex.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return diff >= 0 && diff <= 7;
    });
    const next7DaysQty = next7DaysJobs.reduce((s: number, j: any) => s + Number(j.orderQty || 0), 0);

    const totalSewingActual = filtered.reduce((s: number, j: any) => s + Number(j.sewing?.sewingActualQty || 0), 0);
    const prodCompletionPct = totalOrderQty > 0 ? Math.round((totalSewingActual / totalOrderQty) * 100) : 74;

    // 4. Live Production Pipeline
    const plannedVol = totalOrderQty || 842500;
    const pipeline = [
      { name: 'Fabric In-House', section: 'Store', planned: plannedVol, actual: Math.round(plannedVol * 0.98), pct: 98, status: 'On Track' },
      { name: 'Knitting', section: 'Circular', planned: plannedVol, actual: Math.round(plannedVol * 0.95), pct: 95, status: 'On Track' },
      { name: 'Dyeing', section: 'Dyehouse', planned: plannedVol, actual: Math.round(plannedVol * 0.92), pct: 92, status: 'At Risk' },
      { name: 'Cutting', section: 'Spreading', planned: plannedVol, actual: Math.round(plannedVol * 0.88), pct: 88, status: 'On Track' },
      { name: 'Print / Embroidery', section: 'Screen/Emb', planned: plannedVol, actual: Math.round(plannedVol * 0.85), pct: 85, status: 'On Track' },
      { name: 'Sewing Input', section: 'Lines', planned: plannedVol, actual: Math.round(plannedVol * 0.81), pct: 81, status: 'On Track' },
      { name: 'Sewing Output', section: 'Output', planned: plannedVol, actual: Math.round(plannedVol * 0.74), pct: 74, status: 'At Risk' },
      { name: 'Finishing', section: 'Packing', planned: plannedVol, actual: Math.round(plannedVol * 0.68), pct: 68, status: 'On Track' },
      { name: 'Ready to Ship', section: 'Staging', planned: plannedVol, actual: Math.round(plannedVol * 0.62), pct: 62, status: 'On Track' }
    ];

    // 5. Priority Actions / Exceptions
    const priorityActions: any[] = [];
    filtered.slice(0, 10).forEach((j: any, idx: number) => {
      const risk = calculateJobRisk(j);
      if (risk.level === 'CRITICAL' || risk.level === 'AT_RISK' || idx < 3) {
        const sev = risk.level === 'CRITICAL' ? 'Critical' : risk.level === 'AT_RISK' ? 'High' : idx === 1 ? 'Medium' : 'Info';
        const issues = [
          'Fabric Shortage: 480 KG pending from Dyeing for Body line',
          'T&A Overdue: PP Sample dispatch delay of 4 days',
          'PP Sample Due: Awaiting buyer technical fitting comment',
          'Trims Delay: Care labels pending customs clearance at port',
          'Shade Approval Pending: Lab dip submit 3rd strike pending approval',
          'Production Behind: Sewing line output 18% below planned daily target',
          'Shipment Risk: Cargo cut-off in 5 days with finishing balance'
        ];
        priorityActions.push({
          id: `exc-${j.jobNo}-${idx}`,
          severity: sev,
          issue: issues[idx % issues.length],
          jobNo: j.jobNo,
          styleNo: j.styleNo,
          buyer: j.buyer,
          impact: idx % 2 === 0 ? 'Line 14B stoppage risk tomorrow' : 'Delivery date slippage risk',
          dueDate: j.dates?.cargoClosing || '12-Oct-2026',
          action: 'Follow Up'
        });
      }
    });

    // 6. My Actions List (Interactive with completion persistence)
    const baseActions = [
      { id: 'act-1', bucket: 'today', type: 'Follow Up', jobNo: filtered[0]?.jobNo || '47017', buyer: filtered[0]?.buyer || 'ONLY', style: filtered[0]?.styleNo || 'SITE2106', title: 'Submit 3rd Strike-off sample to buyer QA', dueDate: 'Today, 14:00', priority: 'CRITICAL', status: 'PENDING' },
      { id: 'act-2', bucket: 'today', type: 'Confirm', jobNo: filtered[1]?.jobNo || '47021', buyer: filtered[1]?.buyer || 'ONLY', style: filtered[1]?.styleNo || 'C8A7733', title: 'Review & approve Dyeing recipe adjustment BT-47021', dueDate: 'Today, 17:30', priority: 'HIGH', status: 'PENDING' },
      { id: 'act-3', bucket: 'overdue', type: 'Resolve', jobNo: filtered[2]?.jobNo || '47025', buyer: filtered[2]?.buyer || 'ONLY', style: filtered[2]?.styleNo || 'ZRAW24-001', title: 'PP Fit Sample comments overdue by 2 days', dueDate: '06 Oct 2026', priority: 'CRITICAL', status: 'PENDING' },
      { id: 'act-4', bucket: 'overdue', type: 'Follow Up', jobNo: filtered[3]?.jobNo || '47029', buyer: filtered[3]?.buyer || 'ONLY', style: filtered[3]?.styleNo || 'QSJCOLE LS', title: 'Line 18 loading delay - verify trims receipt', dueDate: '05 Oct 2026', priority: 'HIGH', status: 'PENDING' },
      { id: 'act-5', bucket: 'upcoming', type: 'View', jobNo: filtered[4]?.jobNo || '47033', buyer: filtered[4]?.buyer || 'ONLY', style: filtered[4]?.styleNo || 'PM23640', title: 'Bulk fabric inspection report verification', dueDate: '10 Oct 2026', priority: 'MEDIUM', status: 'PENDING' },
      { id: 'act-6', bucket: 'upcoming', type: 'Confirm', jobNo: filtered[5]?.jobNo || '47036', buyer: filtered[5]?.buyer || 'ONLY', style: filtered[5]?.styleNo || 'NN07-445', title: 'Cargo vessel booking nomination confirmation', dueDate: '14 Oct 2026', priority: 'HIGH', status: 'PENDING' },
    ];

    const myActions = baseActions.map((a) => {
      if (memoryCompletedActionIds.has(a.id)) {
        return { ...a, status: 'COMPLETED', bucket: 'completed' };
      }
      return a;
    });

    // 7. Paginated Job Records
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.max(10, Math.min(100, Number(url.searchParams.get('limit') || 25)));
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const startIndex = (page - 1) * limit;

    const jobs = filtered.slice(startIndex, startIndex + limit).map((j: any) => {
      const risk = calculateJobRisk(j);
      const exDate = j.dates?.exFactory || '21-Oct-2026';
      const orderQty = Number(j.orderQty || 40000);
      const sewingActual = Number(j.sewing?.sewingActualQty || 0);
      const prog = Math.min(100, Math.round((sewingActual / orderQty) * 100)) || 52;

      return {
        id: j.id,
        jobNo: j.jobNo,
        poNo: `PO-NA-${j.jobNo}`,
        buyer: j.buyer,
        styleNo: j.styleNo,
        product: j.item || j.itemDescription || 'T-Shirt',
        itemDescription: j.itemDescription || 'Knit Casual Garment',
        orderQty,
        fobPrice: Number(j.fobPrice || 5.25),
        fobValue: Math.round(orderQty * 5.25),
        shipmentDate: exDate,
        orderDate: j.dates?.poReceived || '01-Oct-2026',
        season: 'FW 2026',
        orderStatus: j.presentStatus || 'In Production',
        poStatus: prog >= 75 ? 'Confirmed' : prog >= 40 ? 'Partial' : 'Pending',
        productionProgress: prog,
        riskStatus: risk.level,
        riskReasons: risk.reasons,
        pendingTask: risk.level === 'CRITICAL' ? 'Urgent Follow-up' : risk.level === 'AT_RISK' ? 'T&A Check' : 'Normal',
        merchandiser: j.merchandiser || 'Shamim Hossain',
        factory: j.lineAllocation?.factory || 'NFL',
        lineAllocation: j.lineAllocation,
        dates: j.dates,
        fabric: j.fabric,
        sewing: j.sewing,
        finishing: j.finishing,
        shipment: j.shipment
      };
    });

    return NextResponse.json({
      success: true,
      role,
      assignedBuyer,
      effectiveBuyer,
      isHead,
      availableBuyers: isHead ? ['ALL', 'ONLY', 'OVS', 'Name It', 'UTG', 'New Look', 'Maurices', 'Only & Sons'] : [assignedBuyer],
      kpis: {
        totalOrders,
        totalPOs,
        totalOrderQty,
        totalFobValue,
        onTimeShipmentPct,
        atRiskOrders: atRiskCount,
        shipmentsNext7Days: next7DaysJobs.length,
        shipmentsNext7DaysQty: next7DaysQty,
        prodCompletionPct,
        capacityMetric: { bookedPct: 92, availablePcs: Math.round(totalOrderQty * 0.08) }
      },
      pipeline,
      priorityActions,
      myActions,
      jobs,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      },
      lastSync: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });
  }

  // 0b. /api/merchandising/jobs/:jobNo
  if (pathStr.startsWith('merchandising/jobs/')) {
    const jobNo = pathStr.replace('merchandising/jobs/', '').trim();
    const found = masterJobs.find((j: any) => String(j.jobNo) === jobNo) || masterJobs[0];
    const risk = calculateJobRisk(found);
    return NextResponse.json({
      success: true,
      job: {
        ...found,
        riskStatus: risk.level,
        riskReasons: risk.reasons,
        productionProgress: Math.round(((found.sewing?.sewingActualQty || 0) / (found.orderQty || 1)) * 100) || 52
      }
    });
  }

  // 0c. /api/merchandising/export
  if (pathStr === 'merchandising/export') {
    const role = (url.searchParams.get('role') || 'MERCHANDISER').toUpperCase();
    const assignedBuyer = url.searchParams.get('assignedBuyer') || 'ONLY';
    const isHead = role === 'HEAD_MERCHANDISER' || role === 'ADMIN';

    let exportJobs = masterJobs.filter((j: any) => {
      const b = String(j.buyer || '').toUpperCase();
      if (!isHead) {
        const assigned = assignedBuyer.toUpperCase();
        if (assigned === 'ONLY') return b.includes('ONLY') || b.includes('CARMA');
        return b.includes(assigned) || assigned.includes(b);
      }
      return true;
    }).slice(0, 500);

    const headers = ['Job No', 'PO No', 'Buyer', 'Style No', 'Product', 'Order Qty (Pcs)', 'FOB (USD)', 'Shipment Date', 'Order Status', 'PO Status', 'Production Progress', 'Risk Status', 'Merchandiser'];
    const rows = exportJobs.map((j: any) => [
      `"${j.jobNo}"`,
      `"PO-NA-${j.jobNo}"`,
      `"${j.buyer}"`,
      `"${j.styleNo}"`,
      `"${j.item || j.itemDescription || 'T-Shirt'}"`,
      j.orderQty,
      Math.round(j.orderQty * 5.25),
      `"${j.dates?.exFactory || '21-Oct-2026'}"`,
      `"${j.presentStatus || 'In Production'}"`,
      `"Confirmed"`,
      `"52%"`,
      `"${j.riskStatus || 'ON_TRACK'}"`,
      `"${j.merchandiser || 'Shamim Hossain'}"`
    ]);

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bulk_merchandising_export.csv"'
      }
    });
  }

  // 1. /api/orders
  if (pathStr === 'orders') {
    const formatted = masterJobs.map((j: any) => {
      const styleId = `s-${j.jobNo}`;
      const savedFollowUp = memoryStyleFollowUps[styleId] || {};
      const savedRevisions = memoryQtyRevisions[styleId] || [];
      const currentQty = savedRevisions.length ? savedRevisions[savedRevisions.length - 1].newQuantity : j.orderQty;

      return {
        id: j.id,
        jobNo: j.jobNo,
        totalQty: currentQty,
        buyer: { id: `b-${j.buyer}`, name: j.buyer, code: j.buyer },
        factory: { id: `f-${j.lineAllocation?.factory || 'NFL'}`, name: j.lineAllocation?.factory === 'NCL' ? 'Northern Clothing Limited (NCL)' : 'Northern Fashions Limited (NFL)', code: j.lineAllocation?.factory || 'NFL' },
        styles: [
          {
            id: styleId,
            styleNo: j.styleNo,
            itemDescription: j.itemDescription,
            quantity: currentQty,
            breakdowns: [
              { color: 'Navy Blazer', size: 'S', qty: Math.round(currentQty * 0.2) },
              { color: 'Navy Blazer', size: 'M', qty: Math.round(currentQty * 0.3) },
              { color: 'Navy Blazer', size: 'L', qty: Math.round(currentQty * 0.3) },
              { color: 'Navy Blazer', size: 'XL', qty: Math.round(currentQty * 0.2) }
            ],
            purchaseOrders: [
              { id: `po-${j.jobNo}`, poNumber: `PO-${j.jobNo}`, ccd: j.dates?.cargoClosing, shipmentDate: j.dates?.exFactory, totalQty: currentQty, breakdowns: [] }
            ],
            sourceMetadata: {
              merchandisingFollowUp: {
                presentStatus: savedFollowUp.presentStatus || j.presentStatus || 'Order Confirmed',
                merchandiser: savedFollowUp.merchandiser || j.merchandiser || 'Md. Jahidul Islam',
                fabricOrderSheetStatus: savedFollowUp.fabricOrderSheetStatus || 'DONE',
                fabricOrderSheetActualDate: savedFollowUp.fabricOrderSheetActualDate || '2026-09-10',
                labDipStatus: savedFollowUp.labDipStatus || 'DONE',
                labDipActualDate: savedFollowUp.labDipActualDate || '2026-09-15',
                printStrikeOffStatus: savedFollowUp.printStrikeOffStatus || 'DONE',
                printStrikeOffActualDate: savedFollowUp.printStrikeOffActualDate || '2026-09-18',
                trimsOrderingStatus: savedFollowUp.trimsOrderingStatus || 'PENDING',
                trimsOrderingActualDate: savedFollowUp.trimsOrderingActualDate || '',
                fileHandoverStatus: savedFollowUp.fileHandoverStatus || 'DONE',
                fileHandoverActualDate: savedFollowUp.fileHandoverActualDate || '2026-09-22',
                workOrderStatus: savedFollowUp.workOrderStatus || 'NA',
                workOrderActualDate: savedFollowUp.workOrderActualDate || '',
                remarks: savedFollowUp.remarks || j.remarks || ''
              },
              qtyRevisionHistory: savedRevisions,
              planning: { taStatus: 'APPROVED', taPlanDate: j.dates?.tnaPlan, fileHandoverDate: '2026-09-20', trimsInhouseDate: '2026-10-05', sewingStartDate: '2026-10-12' },
              production: {
                fabricRequired: j.fabric?.fabricReqKg,
                fabricReceived: j.fabric?.fabricReceivedKg,
                fabricBalance: j.fabric?.fabricBalanceKg,
                cuttingQty: j.cutting?.cuttingQty,
                inputQty: j.sewing?.inputQty,
                packingQty: j.finishing?.packingQty,
                shipQty: j.shipment?.shipQty
              },
              sectionData: {
                quality: { latestStatus: j.finishing?.inspectionStatus || 'PASSED' },
                shipment: { status: j.shipment?.status, balanceQty: j.shipment?.shipBalance }
              }
            }
          }
        ],
        sourceMetadata: { demoData: true, planMonth: j.planMonth }
      };
    });
    return NextResponse.json([...memoryCreatedOrders, ...formatted]);
  }

  // 1a. /api/orders/job-sequence
  if (pathStr === 'orders/job-sequence') {
    return NextResponse.json({
      lastJobNo: memoryJobSequence,
      nextJobNo: memoryJobSequence + 1
    });
  }

  // 1b. /api/orders/repeat-bases
  if (pathStr === 'orders/repeat-bases') {
    const bases = Array.from(new Set(masterJobs.slice(0, 50).map((j: any) => String(j.jobNo))));
    return NextResponse.json(bases);
  }

  // 2. /api/tasks/my or /api/tasks
  if (pathStr === 'tasks/my' || pathStr === 'tasks') {
    return NextResponse.json([
      { id: 't-1', title: 'Batch Topping & Shade Rectification', module: 'dyeing', priority: 'HIGH', status: 'PENDING', dueAt: '2026-10-03', order: { jobNo: '48085', buyer: { name: 'BS-NMT' } } },
      { id: 't-2', title: 'PP Sample Fabric Approval for Name It', module: 'merchandising', priority: 'CRITICAL', status: 'PENDING', dueAt: '2026-10-02', order: { jobNo: '48061', buyer: { name: 'Name It' } } },
      { id: 't-3', title: 'Line 14B Shifting Manpower Balancing', module: 'sewing', priority: 'HIGH', status: 'IN_PROGRESS', dueAt: '2026-10-02', order: { jobNo: '46755', buyer: { name: 'OVS' } } },
      { id: 't-4', title: 'AOP Strike-off Dispatch to Unifill', module: 'dyeing', priority: 'NORMAL', status: 'PENDING', dueAt: '2026-10-04', order: { jobNo: '48002', buyer: { name: 'ONLY' } } },
      { id: 't-5', title: 'Yarn Lot Quality Test Report Verification', module: 'yarn-store', priority: 'NORMAL', status: 'COMPLETED', dueAt: '2026-10-01', order: { jobNo: '46758', buyer: { name: 'UTG' } } }
    ]);
  }

  // 3. /api/planning/capacity/heatmap
  if (pathStr === 'planning/capacity/heatmap') {
    return NextResponse.json({
      thresholds: { greenMax: 85, amberMax: 100 },
      rows: [
        { section: 'knitting', label: 'Knitting', unit: 'KG/day', slots: [{ slot: 'Slot 1', loadPct: 92, demand: 18400, capacity: 20000, jobs: 42, status: 'ATTENTION' }, { slot: 'Slot 2', loadPct: 88, demand: 17600, capacity: 20000, jobs: 38, status: 'NORMAL' }, { slot: 'Slot 3', loadPct: 94, demand: 18800, capacity: 20000, jobs: 46, status: 'ATTENTION' }] },
        { section: 'dyeing', label: 'Dyeing', unit: 'KG/day', slots: [{ slot: 'Slot 1', loadPct: 96, demand: 19200, capacity: 20000, jobs: 35, status: 'ATTENTION' }, { slot: 'Slot 2', loadPct: 91, demand: 18200, capacity: 20000, jobs: 31, status: 'NORMAL' }, { slot: 'Slot 3', loadPct: 89, demand: 17800, capacity: 20000, jobs: 29, status: 'NORMAL' }] },
        { section: 'cutting', label: 'Cutting', unit: 'Pcs/day', slots: [{ slot: 'Slot 1', loadPct: 85, demand: 51000, capacity: 60000, jobs: 24, status: 'NORMAL' }, { slot: 'Slot 2', loadPct: 90, demand: 54000, capacity: 60000, jobs: 26, status: 'ATTENTION' }, { slot: 'Slot 3', loadPct: 84, demand: 50400, capacity: 60000, jobs: 22, status: 'NORMAL' }] },
        { section: 'sewing', label: 'Sewing', unit: 'Pcs/day', slots: [{ slot: 'Slot 1', loadPct: 94, demand: 56400, capacity: 60000, jobs: 48, status: 'ATTENTION' }, { slot: 'Slot 2', loadPct: 98, demand: 58800, capacity: 60000, jobs: 52, status: 'ATTENTION' }, { slot: 'Slot 3', loadPct: 95, demand: 57000, capacity: 60000, jobs: 49, status: 'ATTENTION' }] },
        { section: 'finishing', label: 'Finishing', unit: 'Pcs/day', slots: [{ slot: 'Slot 1', loadPct: 89, demand: 53400, capacity: 60000, jobs: 38, status: 'NORMAL' }, { slot: 'Slot 2', loadPct: 86, demand: 51600, capacity: 60000, jobs: 36, status: 'NORMAL' }, { slot: 'Slot 3', loadPct: 92, demand: 55200, capacity: 60000, jobs: 40, status: 'ATTENTION' }] }
      ],
      sampleRows: [
        { section: 'sample_knitting', label: 'Sample Knitting', unit: 'KG/day', slots: [{ slot: 'Slot 1', loadPct: 75, demandText: '45 KG', capacityText: '60 KG', status: 'NORMAL' }, { slot: 'Slot 2', loadPct: 80, demandText: '48 KG', capacityText: '60 KG', status: 'NORMAL' }, { slot: 'Slot 3', loadPct: 70, demandText: '42 KG', capacityText: '60 KG', status: 'NORMAL' }] },
        { section: 'sample_dyeing', label: 'Sample Dyeing', unit: 'Batch', slots: [{ slot: 'Slot 1', loadPct: 82, demandText: '14 Batch', capacityText: '17 Batch', status: 'NORMAL' }, { slot: 'Slot 2', loadPct: 85, demandText: '15 Batch', capacityText: '17 Batch', status: 'NORMAL' }, { slot: 'Slot 3', loadPct: 78, demandText: '13 Batch', capacityText: '17 Batch', status: 'NORMAL' }] }
      ]
    });
  }

  // 3b. /api/planning/capacity/policies
  if (pathStr === 'planning/capacity/policies') {
    return NextResponse.json({
      bulk: {
        knitting: { label: 'Knitting Bulk Capacity', unit: 'KG', dailyCapacity: 18500 },
        dyeing: { label: 'Dyeing Bulk Capacity', unit: 'KG', dailyCapacity: 18500 },
        cutting: { label: 'Cutting Bulk Capacity', unit: 'Pcs', dailyCapacity: 58000 },
        sewing: { label: 'Sewing Bulk Capacity', unit: 'Pcs', dailyCapacity: 55000 },
        finishing: { label: 'Finishing Bulk Capacity', unit: 'Pcs', dailyCapacity: 55000 }
      },
      sample: {
        knitting: { dailyKg: 60, dailyColors: 8 },
        dyeing: { slotCapacity: 18, ppDevelopmentSlot: 10, smsSlot: 8 },
        printing: { dailyStyles: 6, dailyPcs: 120 },
        making: { monthlyStyles: 90 }
      },
      thresholds: { greenMax: 85, amberMax: 100 }
    });
  }

  // 4. /api/demo/module/:slug (all sections)
  if (pathStr.startsWith('demo/module/')) {
    const slug = pathStr.replace('demo/module/', '');
    const rows = masterJobs.slice(0, 100).map((j: any) => {
      let sectionStatus = 'In Progress';
      let secData: any = {};
      if (slug === 'sewing' || slug === 'garment-production') {
        sectionStatus = j.sewing?.status === 'COMPLETED' ? 'Sewing Completed' : 'Running';
        secData = { productionQty: j.sewing?.sewingActualQty || j.orderQty, balanceQty: j.sewing?.sewingBalance || 0 };
      } else if (slug === 'shipment' || slug === 'management' || slug === 'shipment-system') {
        sectionStatus = j.shipment?.status === 'SHIPPED' ? 'Shipped' : 'Ready / Preparing';
        secData = { shippedQty: j.shipment?.shipQty || j.orderQty, balanceQty: j.shipment?.shipBalance || 0, status: j.shipment?.status === 'SHIPPED' ? 'Ready' : 'Preparing' };
      } else if (slug === 'sewing-planning' || slug === 'central-planning') {
        sectionStatus = j.lineAllocation?.status === 'RELEASED' ? 'Plan Released' : 'In Planning';
        secData = { planStart: j.dates?.sewingStart, planEnd: j.dates?.sewingEnd, line: j.lineAllocation?.line };
      } else if (slug === 'quality' || slug === 'quality-stores') {
        sectionStatus = j.finishing?.inspectionStatus === 'PASSED' ? 'Released / Clear' : 'Hold / Attention';
        secData = { inspection: j.finishing?.inspectionStatus, lotNo: j.yarn?.yarnLotNo };
      } else if (slug === 'yarn' || slug === 'yarn-fabric') {
        sectionStatus = j.fabric?.fabricBalanceKg === 0 ? 'In House / Ready' : 'Dyeing / Knitting';
        secData = { requiredKg: j.yarn?.yarnReqKg || 2500, availableKg: j.yarn?.yarnReceivedKg || 2500, producedKg: j.knitting?.greyProducedKg || 2400 };
      } else if (slug === 'ie-bulletin' || slug === 'ie-overview') {
        sectionStatus = j.ie?.bulletinStatus === 'RELEASED' ? 'IE Released' : 'In Progress';
        secData = { smv: j.ie?.smv || 7.5, machineQty: j.ie?.machineQty || 20, manpower: j.ie?.manpower || 30, dailyTarget: j.ie?.dailyTarget || 2000 };
      } else {
        sectionStatus = 'Released';
        secData = { status: 'OK' };
      }
      return {
        orderId: j.id,
        jobNo: j.jobNo,
        buyer: j.buyer,
        buyerCode: j.buyer,
        styleNo: j.styleNo,
        orderQty: j.orderQty,
        sectionStatus,
        production: {
          cuttingQty: j.cutting?.cuttingQty || j.orderQty,
          sewingQty: j.sewing?.sewingActualQty || j.orderQty,
          packedQty: j.finishing?.packingQty || j.orderQty,
          shippedQty: j.shipment?.shipQty || j.orderQty
        },
        sectionData: secData
      };
    });
    return NextResponse.json(rows);
  }

  // 6. /api/demo/job360 or /api/demo/job360/:id
  if (pathStr.startsWith('demo/job360')) {
    const sub = pathStr.replace('demo/job360', '').replace(/^\//, '');
    if (!sub) {
      const list = masterJobs.map((j: any) => ({
        id: j.id,
        jobNo: j.jobNo,
        buyer: j.buyer,
        buyerCode: j.buyer,
        styleNo: j.styleNo,
        itemDescription: j.itemDescription,
        orderQty: j.orderQty,
        ccd: j.dates?.exFactory || j.dates?.cargoClosing,
        presentStatus: j.presentStatus,
        qualityStatus: j.finishing?.inspectionStatus || 'PASSED',
        shipmentStatus: j.shipment?.status
      }));
      return NextResponse.json(list);
    }
    const found = masterJobs.find((x: any) => x.id === sub || x.jobNo === sub);
    if (found) {
      return NextResponse.json(formatDetailFromMaster(found));
    }
    return NextResponse.json(formatDetailFromMaster(masterJobs[0]));
  }

  // 7. /api/demo/status
  if (pathStr === 'demo/status') {
    return NextResponse.json({
      isLoaded: true,
      totalOrders: masterJobs.length,
      demoBatch: 'NFL-DEMO-2000-AUG-NOV'
    });
  }

  // 8. /api/imports/batches
  if (pathStr === 'imports/batches') {
    return NextResponse.json([
      {
        id: 'batch-demo-2000',
        createdAt: '2026-10-01T07:24:00.000Z',
        moduleSlug: 'report:ERP_MASTER_IMPORT (Aug-Nov 2026)',
        sourceFileName: 'NFL_Pulse_ERP_2000_Job_Realistic_Demo_Aug-Nov_2026.xlsx',
        totalRows: 2000,
        validRows: 2000,
        errorRows: 0,
        status: 'COMMITTED',
        isSystem: true
      },
      {
        id: 'batch-yarn-stock',
        createdAt: '2026-09-28T08:00:00.000Z',
        moduleSlug: 'report:YARN_STOCK_SUMMARY',
        sourceFileName: 'Northern_Fashion_Yarn_Stock_Summary_28Sep26.csv',
        totalRows: 198,
        validRows: 198,
        errorRows: 0,
        status: 'COMMITTED',
        isSystem: true
      },
      {
        id: 'batch-knitting-execution',
        createdAt: '2026-09-25T08:00:00.000Z',
        moduleSlug: 'report:KNITTING_EXECUTION_SUMMARY',
        sourceFileName: 'Knitting_Production_Execution_Summary_Aug2026.csv',
        totalRows: 400,
        validRows: 400,
        errorRows: 0,
        status: 'COMMITTED',
        isSystem: true
      }
    ]);
  }

  // 9. /api/masters/reference-categories
  if (pathStr === 'masters/reference-categories') {
    return NextResponse.json([
      { category: 'BUYER', count: 11 },
      { category: 'SEWING_LINE', count: 91 },
      { category: 'MERCHANDISER', count: 18 },
      { category: 'FLOOR', count: 8 },
      { category: 'PRESENT_STATUS', count: 9 },
      { category: 'DYEING_FACTORY', count: 20 }
    ]);
  }

  // 10. /api/masters/references
  if (pathStr === 'masters/references' || pathStr.startsWith('masters/references/')) {
    const subCat = pathStr.split('/')[2];
    const cat = (subCat ? decodeURIComponent(subCat) : request.nextUrl.searchParams.get('category')) || 'BUYER';
    const cUpper = cat.toUpperCase();

    if (cUpper === 'BUYER') {
      return NextResponse.json([
        { id: 'b-1', value: 'Name It' }, { id: 'b-2', value: 'ONLY' }, { id: 'b-3', value: 'OVS' },
        { id: 'b-4', value: 'UTG' }, { id: 'b-5', value: 'Only & Sons' }, { id: 'b-6', value: 'New Look' },
        { id: 'b-7', value: 'T.M Lewin' }, { id: 'b-8', value: 'Miss Selfridge' }, { id: 'b-9', value: 'Maurices' }
      ]);
    }
    if (cUpper === 'MERCHANDISER') {
      return NextResponse.json([
        { id: 'm-1', value: 'Alamgir' },
        { id: 'm-2', value: 'Rokon' },
        { id: 'm-3', value: 'Mohibur' },
        { id: 'm-4', value: 'Mahamud' },
        { id: 'm-5', value: 'Elias' },
        { id: 'm-6', value: 'Utpal' }
      ]);
    }
    if (cUpper === 'PRESENT_STATUS') {
      return NextResponse.json([
        { id: 'ps-1', value: 'Order Confirmed' },
        { id: 'ps-2', value: 'Running' },
        { id: 'ps-3', value: 'Fabric In-House' },
        { id: 'ps-4', value: 'PP Approved' },
        { id: 'ps-5', value: 'Cut in Progress' },
        { id: 'ps-6', value: 'Sewing Running' },
        { id: 'ps-7', value: 'Finishing' },
        { id: 'ps-8', value: 'Hold / Attention' },
        { id: 'ps-9', value: 'Shipped' }
      ]);
    }
    if (cUpper === 'SEWING_LINE') {
      const lines = [];
      for (let i = 1; i <= 26; i++) {
        lines.push({ id: `l-${i}A`, value: `Line ${i}A (NFL)` });
        lines.push({ id: `l-${i}B`, value: `Line ${i}B (NFL)` });
      }
      return NextResponse.json(lines);
    }
    return NextResponse.json([
      { id: 'v-1', value: 'Confirmed' }, { id: 'v-2', value: 'Running' }, { id: 'v-3', value: 'Cut OK' }, { id: 'v-4', value: 'Sewing OK' }
    ]);
  }

  // 11. /api/masters/buyers
  if (pathStr === 'masters/buyers') {
    return NextResponse.json([
      { id: 'b-only', name: 'ONLY (Main, Carmakoma, Kids)', code: 'ONLY' },
      { id: 'b-ovs', name: 'OVS (Italy)', code: 'OVS' },
      { id: 'b-nameit', name: 'Name It (Bestseller Kids)', code: 'Name It' },
      { id: 'b-utg', name: 'UTG (United Textiles Group)', code: 'UTG' },
      { id: 'b-newlook', name: 'New Look & Miss Selfridge', code: 'New Look' },
      { id: 'b-maurices', name: 'Maurices', code: 'Maurices' },
      { id: 'b-jackjones', name: 'Jack & Jones', code: 'Jack & Jones' },
      { id: 'b-veromoda', name: 'Vero Moda', code: 'Vero Moda' },
      { id: 'b-selected', name: 'Selected', code: 'Selected' }
    ]);
  }

  // 12. /api/masters/lines
  if (pathStr === 'masters/lines') {
    const lines: any[] = [];
    const nflNames = [
      'A1', 'A2', 'B', 'B2', 'C', 'C2', 'D1', 'D2', 'E1', 'E2', 'F',
      'G1', 'G2', 'H1', 'H2', 'J1', 'J2', 'K1', 'K2', 'L1', 'L2', 'M1',
      'M2', 'N1', 'N2', 'O1', 'O2', 'P1', 'P2', 'Q1', 'Q2', 'R1', 'R2',
      'R3', 'S1', 'S2', 'T1', 'T2', 'U', 'V1', 'V2', 'W1', 'W2', 'X1',
      'Y1', 'Y2', 'Z1', 'Z2', 'ZA1', 'ZA2'
    ];
    nflNames.forEach((lineName, i) => {
      const flNum = (i % 3) + 1;
      lines.push({
        id: `nfl-${lineName.toLowerCase()}`,
        code: lineName,
        name: lineName,
        floor: {
          code: `FL-0${flNum}`,
          name: `Floor ${flNum}`,
          section: { code: 'SEC-SEW', name: 'Sewing Section', factory: { code: 'NFL', name: 'Northern Fashions Ltd' } }
        },
        machinePools: [{ id: `mp-nfl-${lineName}`, name: 'Line Stitching Machines', machineCount: 24, active: true }]
      });
    });

    const nclNames = [
      '1', '2', '3', '4', '5', '6', '7', '8A', '8B', '9A', '9B', '10A',
      '10B', '11A', '11B', '12A', '12B', '13A', '13B', '14A', '14B',
      '15A', '15B', '16A', '16B', '17A', '17B', '18A', '18B', '19A',
      '19B', '20A', '20B', '21A', '21B', '22A', '22B', '23A', '23B'
    ];
    nclNames.forEach((lineName, i) => {
      const sNum = (i % 3) + 1;
      lines.push({
        id: `ncl-${lineName.toLowerCase()}`,
        code: lineName,
        name: lineName,
        floor: {
          code: `S-0${sNum}`,
          name: `S-0${sNum} Floor`,
          section: { code: 'SEC-SEW', name: 'Sewing Section', factory: { code: 'NCL', name: 'Northern Clothing Ltd' } }
        },
        machinePools: [{ id: `mp-ncl-${lineName}`, name: 'Line Stitching Machines', machineCount: 22, active: true }]
      });
    });

    return NextResponse.json(lines);
  }

  // 12b. /api/planning/gantt
  if (pathStr === 'planning/gantt') {
    const list = masterJobs.map((j: any) => {
      const fac = j.lineAllocation?.factory || 'NFL';
      const line = j.lineAllocation?.line || 'A1';
      const rawStart = j.dates?.sewingStart || '15-Aug-2026';
      const rawEnd = j.dates?.sewingEnd || '25-Aug-2026';
      const startDt = new Date(rawStart);
      const endDt = new Date(rawEnd);
      const startDate = !isNaN(startDt.getTime()) ? startDt.toISOString().split('T')[0] : '2026-08-15';
      const finishDate = !isNaN(endDt.getTime()) ? endDt.toISOString().split('T')[0] : '2026-08-25';
      const ccdDt = new Date(j.dates?.cargoClosing || j.dates?.exFactory || rawEnd);
      const ccd = !isNaN(ccdDt.getTime()) ? ccdDt.toISOString().split('T')[0] : finishDate;

      return {
        id: j.id,
        jobNo: j.jobNo,
        buyer: j.buyer,
        buyerCode: j.buyer,
        styleId: `s-${j.jobNo}`,
        styleNo: j.styleNo,
        itemDescription: j.itemDescription,
        orderQty: j.orderQty,
        ccd,
        presentStatus: j.presentStatus || 'Confirmed',
        ganttPlan: {
          lineId: `${fac.toLowerCase()}-${line.toLowerCase()}`,
          factoryCode: fac,
          floorCode: j.lineAllocation?.floor || (fac === 'NCL' ? 'S-01' : 'FL-01'),
          lineCode: line,
          startDate,
          finishDate,
          endDate: finishDate,
          status: j.lineAllocation?.status || 'RELEASED',
          dailyTarget: j.ie?.dailyTarget || 1800,
          smv: j.ie?.smv || 7.5,
          manpower: j.ie?.manpower || 30,
          efficiencyPct: j.ie?.efficiencyPct || 80,
          machineQty: j.ie?.machineQty || 19,
          workingHours: j.lineAllocation?.hours || 8,
          actualQty: j.sewing?.sewingActualQty || 0,
          risk: j.riskStatus || 'ON_TRACK',
          splitPlan: []
        },
        sectionData: {
          sewing: {
            productionQty: j.sewing?.sewingActualQty || 0,
            status: j.sewing?.status || 'RUNNING',
            machineQty: j.ie?.machineQty || 19,
            manpower: j.ie?.manpower || 30,
            efficiencyPct: j.ie?.efficiencyPct || 80
          },
          finishedFabricStore: {
            receivedKg: j.fabric?.fabricReceivedKg || 0,
            status: 'READY'
          },
          cutting: {
            cutQty: j.cutting?.cuttingQty || 0,
            status: j.cutting?.status || 'COMPLETED'
          },
          trims: {
            inhousePct: 100,
            status: 'RELEASED'
          }
        }
      };
    });
    return NextResponse.json(list);
  }

  // 13. /api/planning/ta/workqueue
  if (pathStr === 'planning/ta/workqueue') {
    const tnaList = masterJobs.slice(0, 50).map((j: any) => ({
      id: j.id,
      jobNo: j.jobNo,
      buyer: j.buyer,
      styleNo: j.styleNo,
      orderQty: j.orderQty,
      tnaStatus: 'APPROVED',
      tnaPlanDate: j.dates?.tnaPlan,
      exFactoryDate: j.dates?.exFactory,
      cargoClosingDate: j.dates?.cargoClosing,
      presentStatus: j.presentStatus
    }));
    return NextResponse.json(tnaList);
  }

  // 14. /api/cad/workqueue
  if (pathStr === 'cad/workqueue') {
    const cadList = masterJobs.slice(0, 30).map((j: any) => ({
      id: j.id,
      orderId: j.id,
      title: `Consumption Preparation for Style ${j.styleNo}`,
      jobNo: j.jobNo,
      buyer: j.buyer,
      order: {
        id: j.id,
        jobNo: j.jobNo,
        buyer: { name: j.buyer, code: j.buyer }
      },
      styleNo: j.styleNo,
      orderQty: j.orderQty,
      patternStatus: 'RELEASED',
      markerEfficiency: '85.4%',
      fabricWidth: j.fabric?.widthDia || '76"',
      shrinkageLength: '-3%',
      shrinkageWidth: '-2%',
      samplePcs: 6
    }));
    return NextResponse.json(cadList);
  }

  // 14b. /api/cad/orders/:id/consumption
  if (pathStr.startsWith('cad/orders/') && pathStr.endsWith('/consumption')) {
    const orderId = pathStr.split('/')[2];
    const found = masterJobs.find((x: any) => x.id === orderId || x.jobNo === orderId) || masterJobs[0];
    return NextResponse.json({
      order: {
        id: found.id,
        jobNo: found.jobNo,
        buyer: { name: found.buyer, code: found.buyer },
        totalQty: found.orderQty,
        styles: [
          {
            id: `s-${found.jobNo}`,
            styleNo: found.styleNo,
            quantity: found.orderQty,
            breakdowns: [
              { color: 'Black', qty: Math.round(found.orderQty * 0.4) },
              { color: 'White', qty: Math.round(found.orderQty * 0.3) },
              { color: 'Navy', qty: Math.round(found.orderQty * 0.3) }
            ]
          }
        ]
      },
      cadConsumption: {
        remarks: 'Confirmed based on standard marker efficiency 85.4%',
        rows: [
          {
            styleId: `s-${found.jobNo}`,
            color: 'Black',
            orderQty: Math.round(found.orderQty * 0.4),
            fabricDescription: '100% Combed Cotton Single Jersey',
            fabricType: 'Single Jersey',
            gsm: 180,
            dia: '76" Open Width',
            consumptionValue: 2.45,
            consumptionBasis: 'KG_DOZ',
            wastagePct: 5,
            requiredKg: Math.round((found.orderQty * 0.4 / 12) * 2.45 * 1.05),
            remarks: 'Standard body fabric'
          }
        ]
      }
    });
  }

  // 15. /api/knitting/data
  if (pathStr === 'knitting/data') {
    return NextResponse.json({
      orders: knittingExecution.rows || [],
      summary: knittingExecution.summary || {},
      slots: knittingExecution.slots || [],
      yarnNilAlerts: knittingExecution.yarnNilAlerts || []
    });
  }

  // 16. /api/greige-store/data
  if (pathStr === 'greige-store/data') {
    return NextResponse.json(factoryData);
  }

  // 16b. /api/yarn-store/data or /api/yarn-stock/summary
  if (pathStr === 'yarn-store/data' || pathStr === 'yarn-stock/summary') {
    return NextResponse.json(yarnStock);
  }

  // 16c. /api/knitting-execution/summary
  if (pathStr === 'knitting-execution/summary') {
    return NextResponse.json(knittingExecution);
  }

  // 17. /api/ie-ops/kpi
  if (pathStr === 'ie-ops/kpi') {
    const yr = Number(request.nextUrl.searchParams.get('year') || 2026);
    const mo = Number(request.nextUrl.searchParams.get('month') || 8);
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const key = monthKeys[mo - 1] || 'aug';

    const kpiItems = factoryKpi.kpiTracker2026 || [];
    const autoKpis = kpiItems.map((k: any) => {
      const monthVal = k[key];
      const val = monthVal !== null && monthVal !== undefined ? monthVal : k.average;
      return {
        section: k.department,
        kpiKey: `${k.department}_${k.particular}`.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        kpiName: k.particular,
        value: val,
        unit: k.unit || '',
        avg2025: k.avg2025,
        avg2026: k.average,
        monthKey: key,
        source: 'FACTORY_2026_MASTER'
      };
    });

    const manualForMonth = memoryManualKpis.filter(m => Number(m.year) === yr && Number(m.month) === mo);
    return NextResponse.json({
      reportDate: factoryKpi.reportDate || '05.09.2026',
      month: key,
      year: yr,
      auto: autoKpis,
      manual: manualForMonth,
      skillUpgradation: factoryKpi.skillUpgradation || [],
      knittingLostTimeReasons: factoryKpi.knittingLostTimeReasons || []
    });
  }

  // 17b. /api/ie-ops/kpi/master
  if (pathStr === 'ie-ops/kpi/master') {
    return NextResponse.json({
      reportDate: factoryKpi.reportDate || '05.09.2026',
      factoryName: factoryKpi.factoryName || 'Northern Fashion Ltd.',
      items: factoryKpi.kpiTracker2026 || [],
      skillUpgradation: factoryKpi.skillUpgradation || [],
      knittingLostTimeReasons: factoryKpi.knittingLostTimeReasons || [],
      manualOverrides: memoryManualKpis
    });
  }

  // 18. /api/ie-ops/kpi/yearly
  if (pathStr === 'ie-ops/kpi/yearly') {
    const lines = [
      { lineCode: 'Line 01A', floorCode: 'NFL-FL1', avgSmv: 9.20, avgEfficiency: 74.5, avgPerformance: 85.0, production: 54200, avgManpower: 28, otHours: 42, productivity: 4.8 },
      { lineCode: 'Line 02A', floorCode: 'NFL-FL1', avgSmv: 8.80, avgEfficiency: 76.2, avgPerformance: 88.4, production: 58900, avgManpower: 30, otHours: 38, productivity: 5.1 },
      { lineCode: 'Line 03A', floorCode: 'NFL-FL1', avgSmv: 9.60, avgEfficiency: 71.0, avgPerformance: 82.0, production: 51200, avgManpower: 29, otHours: 46, productivity: 4.5 },
      { lineCode: 'Line 04B', floorCode: 'NFL-FL2', avgSmv: 10.40, avgEfficiency: 68.4, avgPerformance: 79.5, production: 48300, avgManpower: 32, otHours: 52, productivity: 4.1 },
      { lineCode: 'Line 05B', floorCode: 'NFL-FL2', avgSmv: 9.50, avgEfficiency: 72.8, avgPerformance: 83.2, production: 53100, avgManpower: 28, otHours: 40, productivity: 4.7 },
      { lineCode: 'Line 06B', floorCode: 'NFL-FL2', avgSmv: 8.90, avgEfficiency: 75.0, avgPerformance: 86.8, production: 56400, avgManpower: 30, otHours: 44, productivity: 4.9 },
      { lineCode: 'Line 11A', floorCode: 'NCL-FL1', avgSmv: 9.80, avgEfficiency: 69.5, avgPerformance: 80.4, production: 49700, avgManpower: 31, otHours: 48, productivity: 4.3 },
      { lineCode: 'Line 12A', floorCode: 'NCL-FL1', avgSmv: 9.10, avgEfficiency: 73.4, avgPerformance: 84.6, production: 54800, avgManpower: 29, otHours: 36, productivity: 4.8 }
    ];
    return NextResponse.json({ lines, overall: { avgEfficiency: 72.6, avgSmv: 9.41, totalProduction: 426600 } });
  }

  // 19. /api/ie-ops/kaizen
  if (pathStr === 'ie-ops/kaizen') {
    const st = request.nextUrl.searchParams.get('status') || 'ALL';
    const list = st === 'ALL' ? memoryKaizenProjects : memoryKaizenProjects.filter(k => k.status === st);
    return NextResponse.json(list);
  }

  // 20. /api/ie-ops/overview
  if (pathStr === 'ie-ops/overview') {
    return NextResponse.json({
      date: '2026-09-24',
      requestedDate: '2026-09-24',
      cards: {
        todayTarget: 68500,
        actualOutput: 71200,
        achievementPct: 103.9,
        efficiencyPct: 74.7,
        avgSmv: 9.85,
        manpower: 1420,
        otHours: 2.5,
        nptMinutes: 18.4,
        avgQcoMinutes: 38.5,
        pendingBulletin: 4,
        openShort: 2
      },
      floorRows: [
        { floor: 'NFL Floor 1', target: 24000, actual: 24800, efficiency: 75.4, smv: 9.2, manpower: 480, ot: 2.0 },
        { floor: 'NFL Floor 2', target: 22500, actual: 23600, efficiency: 74.8, smv: 9.6, manpower: 460, ot: 2.5 },
        { floor: 'NCL Floor 1', target: 22000, actual: 22800, efficiency: 73.9, smv: 10.4, manpower: 480, ot: 3.0 }
      ]
    });
  }

  // 21. /api/ie-ops/line-performance
  if (pathStr === 'ie-ops/line-performance') {
    const sampleLine = (code: string) => ({
      lineCode: code,
      points: [
        { date: '2026-09-01', lineCode: code, jobNo: '48085', smv: 9.2, target: 2200, actual: 2280, performancePct: 103.6, efficiencyPct: 75.4, manpower: 28, otHours: 2, nptMinutes: 14, majorNpt: { type: 'Machine', minutes: 8 }, qcoMinutes: 0, productivity: 4.8 },
        { date: '2026-09-02', lineCode: code, jobNo: '48085', smv: 9.2, target: 2200, actual: 2310, performancePct: 105.0, efficiencyPct: 76.2, manpower: 28, otHours: 2, nptMinutes: 10, majorNpt: null, qcoMinutes: 0, productivity: 4.9 },
        { date: '2026-09-03', lineCode: code, jobNo: '48061', smv: 9.8, target: 2000, actual: 2050, performancePct: 102.5, efficiencyPct: 74.0, manpower: 29, otHours: 2, nptMinutes: 18, majorNpt: { type: 'Style Change', minutes: 15 }, qcoMinutes: 35, productivity: 4.6 }
      ]
    });
    return NextResponse.json({ lines: [sampleLine('Line 01A'), sampleLine('Line 02A'), sampleLine('Line 04B'), sampleLine('Line 11A')] });
  }

  // 22. /api/ie/workqueue (used by ie-bulletin and ie-readiness)
  if (pathStr === 'ie/workqueue') {
    const list = masterJobs.slice(0, 30).map((j: any) => ({
      jobNo: j.jobNo,
      status: j.ie?.bulletinStatus || 'RELEASED',
      buyer: { id: `b-${j.buyer}`, name: j.buyer, code: j.buyer },
      style: {
        id: `style-${j.jobNo}`,
        styleNo: j.styleNo,
        itemDescription: j.itemDescription,
        orderQty: j.orderQty,
        ieBulletin: {
          bulletinDate: '2026-08-15',
          releaseDate: '2026-08-15',
          updatedAt: '2026-08-15',
          revision: 1,
          smv: j.ie?.smv || 9.2,
          dailyTarget: j.ie?.dailyTarget || 1800,
          operator: 22,
          helper: 6,
          finishingManpower: 2,
          manpower: j.ie?.manpower || 30,
          machineQty: j.ie?.machineQty || 19,
          achievableEfficiencyPct: j.ie?.efficiencyPct || 75,
          remarks: 'Released for Gantt production line',
          machineRequirements: [
            { machineType: 'SNLS', qty: 10 },
            { machineType: '4T OL', qty: 6 },
            { machineType: 'Flatlock', qty: 3 }
          ]
        },
        readiness: [
          { key: 'PRODUCTION_LOT', label: 'Production Lot', status: 'READY', note: 'Lot staged' },
          { key: 'COLOR_SIZE', label: 'Color×Size Ratio', status: 'READY', note: 'Approved pack sheet' },
          { key: 'SAMPLE', label: 'PP Sample', status: 'READY', note: 'Approved by buyer' },
          { key: 'FILE', label: 'Production File', status: 'READY', note: 'Handed to line' },
          { key: 'PP', label: 'Pre-Production Meeting', status: 'READY', note: 'PP meeting signed' },
          { key: 'FABRIC', label: 'Bulk Fabric Delivery', status: 'READY', note: '100% delivered to cutting' },
          { key: 'TRIMS', label: 'Trims In-House', status: 'READY', note: 'All trims verified in-house' }
        ]
      },
      followUp: {
        status: 'DONE',
        line: j.lineAllocation?.line || 'Line 01A',
        planMonth: j.planMonth || 'Aug-26',
        bulletinDate: '2026-08-15',
        revision: 1,
        sourceFileName: 'IE_BULLETIN_AUG_2026.xlsx',
        pendingDays: 0
      }
    }));
    return NextResponse.json(list);
  }

  // 23. /api/maintenance/weekly-requirement
  if (pathStr === 'maintenance/weekly-requirement') {
    const days = [
      {
        date: '2026-09-24',
        dayLabel: 'Thu (Today)',
        shortageQty: 0,
        rows: [
          { normalizedKey: 'snls', machineType: 'SNLS', requiredQty: 385, totalQty: 420, breakdownQty: 12, rentQty: 0, netAvailableQty: 408, shortageQty: 0, surplusQty: 23, status: 'AVAILABLE', jobs: [{ line: 'Line 01A', jobNo: '48085', styleNo: '13251506' }] },
          { normalizedKey: '4t-ol', machineType: '4-Thread Overlock', requiredQty: 295, totalQty: 310, breakdownQty: 8, rentQty: 10, netAvailableQty: 312, shortageQty: 0, surplusQty: 17, status: 'AVAILABLE', jobs: [{ line: 'Line 02A', jobNo: '48085', styleNo: '13251506' }] },
          { normalizedKey: 'flatlock', machineType: 'Flatlock', requiredQty: 135, totalQty: 140, breakdownQty: 5, rentQty: 0, netAvailableQty: 135, shortageQty: 0, surplusQty: 0, status: 'AVAILABLE', jobs: [{ line: 'Line 04B', jobNo: '46755', styleNo: '13251509' }] }
        ]
      },
      {
        date: '2026-09-25',
        dayLabel: 'Fri',
        shortageQty: 0,
        rows: [
          { normalizedKey: 'snls', machineType: 'SNLS', requiredQty: 390, totalQty: 420, breakdownQty: 10, rentQty: 0, netAvailableQty: 410, shortageQty: 0, surplusQty: 20, status: 'AVAILABLE', jobs: [] },
          { normalizedKey: '4t-ol', machineType: '4-Thread Overlock', requiredQty: 298, totalQty: 310, breakdownQty: 8, rentQty: 10, netAvailableQty: 312, shortageQty: 0, surplusQty: 14, status: 'AVAILABLE', jobs: [] }
        ]
      }
    ];
    return NextResponse.json({
      summary: {
        shortageTypes: 0,
        peakShortageQty: 0,
        daysWithShortage: 0,
        affectedLines: 0,
        affectedJobs: 0
      },
      days
    });
  }

  // 24. /api/maintenance/dashboard
  if (pathStr === 'maintenance/dashboard') {
    const runningJobs = masterJobs.slice(0, 15).map((j: any) => ({
      styleId: `s-${j.jobNo}`,
      line: j.lineAllocation?.line || 'Line 01A',
      jobNo: j.jobNo,
      styleNo: j.styleNo,
      floor: j.lineAllocation?.floor || 'Floor 1',
      status: 'RUNNING',
      totalMachine: j.ie?.machineQty || 19,
      machineRequirements: [
        { machineType: 'SNLS', qty: 10 },
        { machineType: '4T OL', qty: 6 },
        { machineType: 'Flatlock', qty: 3 }
      ]
    }));
    return NextResponse.json({
      summary: {
        total: 1221,
        breakdown: 35,
        available: 1196,
        required: 1140,
        idle: 56,
        shortage: 0
      },
      rows: maintenanceMachines,
      runningJobs,
      changeovers: [
        {
          date: '2026-09-26',
          line: 'Line 02A',
          oldJob: '48085',
          oldStyle: '13251506',
          newJob: '48061',
          newStyle: '13251509',
          changes: [
            { machineType: '4T OL', delta: 2, action: 'ADD' },
            { machineType: 'Flatlock', delta: -1, action: 'REMOVE' }
          ]
        }
      ]
    });
  }

  // 25. /api/ie-ops/target-context
  if (pathStr === 'ie-ops/target-context') {
    const floor = request.nextUrl.searchParams.get('floor') || 'Sewing-01';
    let lines = [
      {
        code: 'Line 01A',
        jobs: [
          { jobNo: '48085', styleNo: '13251506', styleId: 's-48085', smv: 9.2, manpower: 28, workingHours: 8 }
        ]
      },
      {
        code: 'Line 02A',
        jobs: [
          { jobNo: '48061', styleNo: '13251509', styleId: 's-48061', smv: 9.8, manpower: 30, workingHours: 8 }
        ]
      },
      {
        code: 'Line 03A',
        jobs: [
          { jobNo: '48002', styleNo: '13251512', styleId: 's-48002', smv: 8.6, manpower: 28, workingHours: 8 }
        ]
      },
      {
        code: 'Line 04A',
        jobs: [
          { jobNo: '48092', styleNo: '13251520', styleId: 's-48092', smv: 10.4, manpower: 32, workingHours: 8 }
        ]
      }
    ];

    let lineActuals = [
      { lineCode: 'Line 01A', employee: 28, operator: 22, targetEfficiencyPct: 75.4 },
      { lineCode: 'Line 02A', employee: 30, operator: 24, targetEfficiencyPct: 76.2 },
      { lineCode: 'Line 03A', employee: 28, operator: 22, targetEfficiencyPct: 71.0 },
      { lineCode: 'Line 04A', employee: 32, operator: 26, targetEfficiencyPct: 74.5 }
    ];

    let summary = {
      todayActual: { employee: 118 },
      previousDay: { target: 68500, output: 71200, efficiency: 74.7 }
    };

    if (floor === 'Sewing-02') {
      lines = [
        {
          code: 'Line 05B',
          jobs: [
            { jobNo: '46755', styleNo: '13251480', styleId: 's-46755', smv: 11.2, manpower: 32, workingHours: 8 }
          ]
        },
        {
          code: 'Line 06B',
          jobs: [
            { jobNo: '46758', styleNo: '13251495', styleId: 's-46758', smv: 8.9, manpower: 28, workingHours: 8 }
          ]
        },
        {
          code: 'Line 07B',
          jobs: [
            { jobNo: '48110', styleNo: '13251532', styleId: 's-48110', smv: 9.5, manpower: 30, workingHours: 8 }
          ]
        }
      ];
      lineActuals = [
        { lineCode: 'Line 05B', employee: 32, operator: 25, targetEfficiencyPct: 73.0 },
        { lineCode: 'Line 06B', employee: 28, operator: 22, targetEfficiencyPct: 77.5 },
        { lineCode: 'Line 07B', employee: 30, operator: 24, targetEfficiencyPct: 72.8 }
      ];
      summary = {
        todayActual: { employee: 90 },
        previousDay: { target: 54000, output: 55800, efficiency: 75.1 }
      };
    } else if (floor === 'Sewing-03') {
      lines = [
        {
          code: 'Line 11A',
          jobs: [
            { jobNo: '48115', styleNo: '13251540', styleId: 's-48115', smv: 12.0, manpower: 34, workingHours: 8 }
          ]
        },
        {
          code: 'Line 12A',
          jobs: [
            { jobNo: '48120', styleNo: '13251545', styleId: 's-48120', smv: 7.8, manpower: 26, workingHours: 8 }
          ]
        },
        {
          code: 'Line 13A',
          jobs: [
            { jobNo: '48085', styleNo: '13251506', styleId: 's-48085', smv: 9.2, manpower: 28, workingHours: 8 }
          ]
        }
      ];
      lineActuals = [
        { lineCode: 'Line 11A', employee: 34, operator: 28, targetEfficiencyPct: 71.5 },
        { lineCode: 'Line 12A', employee: 26, operator: 20, targetEfficiencyPct: 78.0 },
        { lineCode: 'Line 13A', employee: 28, operator: 22, targetEfficiencyPct: 75.0 }
      ];
      summary = {
        todayActual: { employee: 88 },
        previousDay: { target: 52000, output: 53900, efficiency: 73.9 }
      };
    }

    const currentLineCodes = lines.map(l => l.code);
    const existingForFloor = memoryTargets.filter(t => !t.floorCode || t.floorCode === floor || currentLineCodes.includes(t.lineCode));

    return NextResponse.json({
      lines,
      existing: existingForFloor,
      lineActuals,
      summary
    });
  }

  // 26. /api/ie-ops/jobs/search
  if (pathStr === 'ie-ops/jobs/search') {
    const q = (request.nextUrl.searchParams.get('q') || '').toLowerCase();
    const found = masterJobs
      .filter((j: any) => `${j.jobNo} ${j.styleNo} ${j.buyer}`.toLowerCase().includes(q))
      .slice(0, 10)
      .map((j: any) => ({
        jobNo: j.jobNo,
        styleNo: j.styleNo,
        styleId: `s-${j.jobNo}`,
        smv: j.ie?.smv || 9.2,
        manpower: j.ie?.manpower || 30
      }));
    return NextResponse.json(found);
  }

  // 27. /api/ie-ops/npt/summary and /api/ie-ops/npt
  if (pathStr === 'ie-ops/npt/summary') {
    return NextResponse.json({
      totalMinutes: 485,
      lostMoney: 58200,
      breakdownMinutes: 165,
      byType: [
        { name: 'Mechanical Breakdown', value: 165 },
        { name: 'Input Wait (Cut Panels)', value: 140 },
        { name: 'Thread Breakage / Trims', value: 85 },
        { name: 'Pattern / Size Correction', value: 55 },
        { name: 'Electricity / Air Pressure', value: 40 }
      ],
      byLine: [
        { name: 'Line 04B', value: 110 },
        { name: 'Line 01A', value: 85 },
        { name: 'Line 11A', value: 65 },
        { name: 'Line 02A', value: 60 }
      ],
      machineBreakdown: [
        { name: '4T Overlock (Side Seam)', total: 65, waiting: 20, repair: 45 },
        { name: 'Flatlock (Hemming)', total: 55, waiting: 15, repair: 40 },
        { name: 'SNLS (Collar Stitch)', total: 45, waiting: 10, repair: 35 }
      ],
      byDate: [
        { name: '2026-09-20', value: 95, efficiency: 74.2 },
        { name: '2026-09-21', value: 80, efficiency: 75.8 },
        { name: '2026-09-22', value: 70, efficiency: 76.5 },
        { name: '2026-09-23', value: 110, efficiency: 73.1 },
        { name: '2026-09-24', value: 65, efficiency: 77.2 }
      ]
    });
  }

  if (pathStr === 'ie-ops/npt') {
    return NextResponse.json(memoryNptRecords);
  }

  // 28. /api/ie-ops/checkpoints
  if (pathStr === 'ie-ops/checkpoints') {
    const list = [
      { id: 'cp-1', lineCode: 'Line 01A', jobNo: '48085', smv: 9.2, firstHourTarget: 220, firstHourActual: 215, fourHourTarget: 880, fourHourActual: 905, eightHourTarget: 1760, eightHourActual: 1810, otActual: 240, dailyTarget: 2000, dailyActual: 2050, efficiencyPct: 76.5 },
      { id: 'cp-2', lineCode: 'Line 02A', jobNo: '48061', smv: 9.8, firstHourTarget: 200, firstHourActual: 195, fourHourTarget: 800, fourHourActual: 820, eightHourTarget: 1600, eightHourActual: 1640, otActual: 210, dailyTarget: 1800, dailyActual: 1850, efficiencyPct: 75.2 },
      { id: 'cp-3', lineCode: 'Line 03A', jobNo: '48002', smv: 8.6, firstHourTarget: 240, firstHourActual: 230, fourHourTarget: 960, fourHourActual: 980, eightHourTarget: 1920, eightHourActual: 1950, otActual: 260, dailyTarget: 2200, dailyActual: 2210, efficiencyPct: 72.8 }
    ];
    return NextResponse.json(list);
  }

  // 29. /api/ie-ops/qco
  if (pathStr === 'ie-ops/qco') {
    return NextResponse.json(memoryQcoRecords);
  }

  if (pathStr === 'ie-ops/qco/rules') {
    return NextResponse.json([
      { id: 'r-1', styleCategory: 'Basic T-Shirt', standardQcoMinutes: 25, benchmarkEfficiencyPct: 75 },
      { id: 'r-2', styleCategory: 'Polo Shirt', standardQcoMinutes: 35, benchmarkEfficiencyPct: 70 },
      { id: 'r-3', styleCategory: 'Hooded Sweatshirt (Fleece)', standardQcoMinutes: 45, benchmarkEfficiencyPct: 65 }
    ]);
  }

  // 30. /api/ie-ops/skill-matrix
  if (pathStr === 'ie-ops/skill-matrix') {
    return NextResponse.json(memorySkills);
  }

  // 31. /api/ie-ops/responsibility
  if (pathStr === 'ie-ops/responsibility') {
    return NextResponse.json(memoryResponsibilities);
  }

  // 32. /api/documents/styles
  if (pathStr === 'documents/styles') {
    const q = (request.nextUrl.searchParams.get('q') || '').toLowerCase();
    const rows = masterJobs
      .filter((j: any) => !q || `${j.jobNo} ${j.styleNo} ${j.buyer} ${j.itemDescription || ''}`.toLowerCase().includes(q))
      .slice(0, 20)
      .map((j: any) => ({
        id: `style-${j.jobNo}`,
        styleNo: j.styleNo,
        itemDescription: j.itemDescription,
        quantity: j.orderQty,
        order: {
          id: j.id,
          jobNo: j.jobNo,
          buyer: { id: `b-${j.buyer}`, name: j.buyer, code: j.buyer }
        },
        productionLots: [
          { id: `lot-${j.jobNo}-1`, code: 'LOT-01', name: 'Main Bulk', totalQty: j.orderQty, status: 'IN_PRODUCTION' }
        ]
      }));
    return NextResponse.json(rows);
  }

  // 32b. /api/documents/styles/:id/forms
  if (pathStr.startsWith('documents/styles/') && pathStr.endsWith('/forms')) {
    const styleId = pathStr.split('/')[2];
    const jobNo = styleId.replace('style-', '');
    return NextResponse.json({
      forms: [
        {
          id: `doc-${jobNo}-tna`,
          type: 'TNA_PLAN',
          templateVersion: 'v1.2 Company Standard',
          status: 'APPROVED',
          revision: 1,
          createdAt: '2026-08-01T10:00:00.000Z',
          updatedAt: '2026-08-05T14:00:00.000Z',
          data: {
            jobNo,
            buyer: 'BS-NMT',
            styleNo: '13251506',
            garmentDescription: 'Men Heavyweight Fleece Hoodie',
            totalOrderQty: 3000,
            merchandiser: 'Alamgir'
          }
        }
      ]
    });
  }

  // 33. /api/planning/quota
  if (pathStr === 'planning/quota') {
    return NextResponse.json({
      reportDate: factoryKpi.reportDate,
      buyerQuota: factoryKpi.buyerQuota || [],
      sampleCapacity: factoryKpi.sampleCapacity || []
    });
  }

  // 34. /api/management/fob
  if (pathStr === 'management/fob') {
    return NextResponse.json({
      analytics: factoryKpi.fobAnalytics || []
    });
  }

  // 35. /api/kpi-tracker/full
  if (pathStr === 'kpi-tracker/full') {
    return NextResponse.json(factoryKpi);
  }

  // 36. /api/imports/running/:slug
  if (pathStr.startsWith('imports/running')) {
    const slug = pathStr.split('/')[2] || 'general';
    const rows = masterJobs.slice(0, 30).map((j: any, i: number) => ({
      id: `imp-${slug}-${i}`,
      jobNo: j.jobNo,
      buyer: j.buyer,
      styleNo: j.styleNo,
      itemDescription: j.itemDescription,
      date: j.dates?.orderReceive || '2026-09-01',
      status: j.presentStatus || 'Running',
      productionQty: j.orderQty,
      balanceQty: 0,
      file: `${slug.toUpperCase()}_PRODUCTION_DATA.xlsx`,
      sheet: 'Active',
      rowNumber: i + 2
    }));
    return NextResponse.json(rows);
  }

  // Default fallback for any other GET: return array or safe object
  if (pathStr.includes('search') || pathStr.includes('list') || pathStr.includes('rows') || pathStr.includes('batches') || pathStr.includes('running')) {
    return NextResponse.json([]);
  }
  return NextResponse.json({ status: 'ok', path: pathStr, totalJobs: masterJobs.length });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');

  if (pathStr === 'merchandising/actions/complete') {
    const body = await request.json().catch(() => ({}));
    if (body.actionId) {
      memoryCompletedActionIds.add(String(body.actionId));
    }
    return NextResponse.json({ success: true, actionId: body.actionId, completedActionIds: Array.from(memoryCompletedActionIds) });
  }

  if (pathStr === 'orders/job-sequence') {
    const body = await request.json().catch(() => ({}));
    if (body.lastJobNo) memoryJobSequence = Number(body.lastJobNo);
    return NextResponse.json({ lastJobNo: memoryJobSequence, nextJobNo: memoryJobSequence + 1 });
  }

  if (pathStr === 'orders') {
    const body = await request.json().catch(() => ({}));
    memoryJobSequence += 1;
    const newJobNo = String(memoryJobSequence);
    const buyerId = body.buyerId || 'b-only';
    let buyerName = 'ONLY';
    if (buyerId.includes('ovs')) buyerName = 'OVS';
    else if (buyerId.includes('nameit')) buyerName = 'Name It';
    else if (buyerId.includes('utg')) buyerName = 'UTG';
    else if (buyerId.includes('newlook')) buyerName = 'New Look';
    else if (buyerId.includes('maurices')) buyerName = 'Maurices';

    const newOrder = {
      id: `ord-${newJobNo}`,
      jobNo: newJobNo,
      totalQty: (body.styles || []).reduce((s: number, st: any) => s + Number(st.quantity || 0), 0) || 5000,
      buyer: { id: buyerId, name: buyerName, code: buyerName },
      factory: { id: 'f-nfl', name: 'Northern Fashions Limited (NFL)', code: 'NFL' },
      styles: (body.styles || []).map((st: any) => ({
        id: `s-${newJobNo}`,
        styleNo: st.styleNo || `ST-${newJobNo}`,
        itemDescription: st.itemDescription || 'Knit Garment',
        quantity: Number(st.quantity || 5000),
        breakdowns: st.breakdowns || [],
        purchaseOrders: (st.pos || []).map((p: any, pi: number) => ({
          id: `po-${newJobNo}-${pi + 1}`,
          poNumber: p.poNumber || `PO-${newJobNo}`,
          ccd: p.ccd || '2026-10-25',
          shipmentDate: p.shipmentDate || p.ccd || '2026-10-25',
          totalQty: Number(p.totalQty || 0),
          breakdowns: p.breakdowns || []
        })),
        sourceMetadata: {
          merchandisingFollowUp: { presentStatus: 'Order Confirmed', merchandiser: 'Md. Jahidul Islam' },
          planning: { taStatus: 'APPROVED', taPlanDate: '2026-10-05' },
          production: { fabricRequired: 1200, fabricReceived: 0, cuttingQty: 0, inputQty: 0, shipQty: 0 }
        }
      }))
    };

    memoryCreatedOrders.unshift(newOrder);

    return NextResponse.json({
      success: true,
      order: {
        id: newOrder.id,
        jobNo: newJobNo,
        buyerId,
        styles: newOrder.styles
      },
      warnings: []
    });
  }

  if (pathStr === 'orders/import/preview') {
    const isOvs = request.headers.get('buyerCode')?.toLowerCase().includes('ovs');
    const parserFamily = isOvs ? 'OVS' : 'Bestseller';
    return NextResponse.json({
      parserFamily,
      parserVersion: 'v2.4-canonical',
      validation: {
        status: 'VALIDATED',
        checks: [
          { code: 'STYLE_COLOR_TOTAL', ok: true, message: 'Style quantities reconcile with Color × Size total ✓' },
          { code: 'ORDER_REFERENCE_TOTAL', ok: true, message: 'Country/PO allocation matches style total ✓' }
        ]
      },
      styles: [
        {
          styleNo: '13251506',
          styleDescription: 'Crew Neck Knit Top - Short Sleeve',
          totalQty: 12000,
          collection: 'Autumn 26',
          season: 'Fall/Winter',
          colors: [
            {
              color: 'Navy Blazer',
              colorCode: '19-3921',
              totalQty: 12000,
              sizes: [
                { size: 'S', qty: 2400 },
                { size: 'M', qty: 3600 },
                { size: 'L', qty: 3600 },
                { size: 'XL', qty: 2400 }
              ]
            }
          ],
          orderReferences: [
            {
              reference: isOvs ? 'OVS GERMANY' : 'PO-48093-DE',
              referenceType: isOvs ? 'MARKET' : 'PO',
              market: 'Germany (DE)',
              totalQty: 4800,
              shipmentDate: '2026-10-15',
              ccd: '2026-10-12',
              destination: 'Hamburg Port',
              colors: [
                {
                  color: 'Navy Blazer',
                  colorCode: '19-3921',
                  totalQty: 4800,
                  sizes: [{ size: 'S', qty: 960 }, { size: 'M', qty: 1440 }, { size: 'L', qty: 1440 }, { size: 'XL', qty: 960 }]
                }
              ]
            },
            {
              reference: isOvs ? 'OVS FRANCE' : 'PO-48093-FR',
              referenceType: isOvs ? 'MARKET' : 'PO',
              market: 'France (FR)',
              totalQty: 3600,
              shipmentDate: '2026-10-18',
              ccd: '2026-10-15',
              destination: 'Le Havre Port',
              colors: [
                {
                  color: 'Navy Blazer',
                  colorCode: '19-3921',
                  totalQty: 3600,
                  sizes: [{ size: 'S', qty: 720 }, { size: 'M', qty: 1080 }, { size: 'L', qty: 1080 }, { size: 'XL', qty: 720 }]
                }
              ]
            },
            {
              reference: isOvs ? 'OVS ITALY' : 'PO-48093-IT',
              referenceType: isOvs ? 'MARKET' : 'PO',
              market: 'Italy (IT)',
              totalQty: 3600,
              shipmentDate: '2026-10-22',
              ccd: '2026-10-19',
              destination: 'Genoa Port',
              colors: [
                {
                  color: 'Navy Blazer',
                  colorCode: '19-3921',
                  totalQty: 3600,
                  sizes: [{ size: 'S', qty: 720 }, { size: 'M', qty: 1080 }, { size: 'L', qty: 1080 }, { size: 'XL', qty: 720 }]
                }
              ]
            }
          ]
        }
      ],
      warnings: []
    });
  }

  if (pathStr === 'orders/import/confirm') {
    memoryJobSequence += 1;
    const newJobNo = String(memoryJobSequence);
    return NextResponse.json({
      success: true,
      jobNo: newJobNo,
      message: `Imported Job ${newJobNo} successfully created and registered.`
    });
  }

  if (pathStr === 'uploads/item-image') {
    return NextResponse.json({
      url: '/branding/northern-fashions-logo.jpg',
      name: 'item-preview.jpg',
      success: true
    });
  }

  if (pathStr === 'auth/login') {
    const body = await request.json().catch(() => ({}));
    const email = body.email || 'admin@nfl.local';
    const user = {
      id: 'u-admin-1',
      email,
      name: email.split('@')[0] === 'admin' ? 'NFL Administrator' : 'Executive User',
      roles: ['ADMIN', 'MANAGEMENT']
    };
    return NextResponse.json({
      success: true,
      accessToken: 'demo-access-token-' + Date.now(),
      refreshToken: 'demo-refresh-token-' + Date.now(),
      user
    });
  }

  if (pathStr === 'ie-ops/npt') {
    const body = await request.json().catch(() => ({}));
    const record = { id: `npt-${Date.now()}`, recordKind: 'LINE_NPT', ...body };
    memoryNptRecords = [record, ...memoryNptRecords];
    return NextResponse.json(record);
  }

  if (pathStr === 'ie-ops/targets') {
    const body = await request.json().catch(() => ({}));
    const targetId = body.id || `tgt-${Date.now()}`;
    const target = { ...body, id: targetId, updatedAt: new Date().toISOString() };
    const existingIndex = memoryTargets.findIndex(t => t.id === targetId || (t.date === body.date && t.lineCode === body.lineCode && t.jobNo === body.jobNo));
    if (existingIndex >= 0) {
      memoryTargets[existingIndex] = { ...memoryTargets[existingIndex], ...target };
    } else {
      memoryTargets = [target, ...memoryTargets];
    }
    return NextResponse.json(target);
  }

  if (pathStr === 'ie-ops/skill-matrix') {
    const body = await request.json().catch(() => ({}));
    const skill = { id: `sk-${Date.now()}`, ...body };
    memorySkills = [skill, ...memorySkills];
    return NextResponse.json(skill);
  }

  if (pathStr === 'ie-ops/responsibility') {
    const body = await request.json().catch(() => ({}));
    const resp = { id: `resp-${Date.now()}`, ...body };
    memoryResponsibilities = [resp, ...memoryResponsibilities];
    return NextResponse.json(resp);
  }

  if (pathStr === 'ie-ops/qco') {
    const body = await request.json().catch(() => ({}));
    const qco = { id: `qco-${Date.now()}`, ...body };
    memoryQcoRecords = [qco, ...memoryQcoRecords];
    return NextResponse.json(qco);
  }

  if (pathStr === 'ie-ops/kpi/manual') {
    const body = await request.json().catch(() => ({}));
    const kpiKey = body.kpiKey || `${body.section}_${body.kpiName}`.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const entry = {
      id: `manual-kpi-${Date.now()}`,
      section: body.section || 'Sewing',
      kpiKey,
      kpiName: body.kpiName || body.particular || '',
      value: Number(body.value || 0),
      unit: body.unit || '%',
      year: Number(body.year || 2026),
      month: Number(body.month || 8),
      target: body.target ? Number(body.target) : undefined,
      remarks: body.remarks || '',
      createdAt: new Date().toISOString()
    };
    const existingIdx = memoryManualKpis.findIndex(m => m.kpiKey === entry.kpiKey && m.year === entry.year && m.month === entry.month);
    if (existingIdx >= 0) {
      memoryManualKpis[existingIdx] = { ...memoryManualKpis[existingIdx], ...entry };
    } else {
      memoryManualKpis = [entry, ...memoryManualKpis];
    }
    return NextResponse.json({ success: true, item: entry });
  }

  if (pathStr === 'maintenance/master') {
    const body = await request.json().catch(() => ({}));
    const machine = { id: `m-${Date.now()}`, breakdownQty: 0, rentQty: 0, actualUtilizedQty: 0, reportedUnusedQty: body.totalQty || 0, workingQty: body.totalQty || 0, remarks: 'Added to fleet', ...body };
    maintenanceMachines = [machine, ...maintenanceMachines];
    return NextResponse.json(machine);
  }

  if (pathStr === 'maintenance/daily/import') {
    return NextResponse.json({ success: true, message: 'Daily machine utilization imported successfully.' });
  }

  if (pathStr === 'imports/preview') {
    return NextResponse.json({ batchId: `preview-${Date.now()}`, reportType: 'IE_BULLETIN', totalRows: 24, validRows: 24, errorRows: 0 });
  }

  if (pathStr.includes('/commit')) {
    return NextResponse.json({ success: true, message: 'Batch committed to system records.' });
  }

  if (pathStr === 'demo/load') {
    return NextResponse.json({ createdOrders: 2000, message: 'All 2,000 jobs loaded and active' });
  }

  return NextResponse.json({ success: true, message: `Action on ${pathStr} recorded successfully` });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  const body = await request.json().catch(() => ({}));

  if (pathStr.startsWith('maintenance/master/')) {
    const id = pathStr.split('/')[2];
    maintenanceMachines = maintenanceMachines.map(m => m.id === id ? { ...m, ...body } : m);
    return NextResponse.json({ success: true });
  }

  if (pathStr.startsWith('maintenance/daily/')) {
    return NextResponse.json({ success: true });
  }

  if (pathStr.startsWith('ie-ops/targets/') && pathStr.endsWith('/close')) {
    return NextResponse.json({ success: true, status: 'CLOSED', ...body });
  }

  if (pathStr.startsWith('ie/styles/')) {
    return NextResponse.json({ success: true, message: 'IE Bulletin updated and released' });
  }

  return NextResponse.json({ success: true, ...body });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  const body = await request.json().catch(() => ({}));

  if (pathStr.includes('merchandising-followup')) {
    const styleId = pathStr.split('/')[2];
    memoryStyleFollowUps[styleId] = { ...(memoryStyleFollowUps[styleId] || {}), ...body };
    return NextResponse.json({ success: true, message: 'Follow-up saved', followUp: memoryStyleFollowUps[styleId] });
  }

  if (pathStr.includes('quantity-revision')) {
    const styleId = pathStr.split('/')[2];
    const prev = memoryQtyRevisions[styleId] || [];
    const rev = {
      oldQuantity: body.oldQuantity || 3000,
      newQuantity: Number(body.newQuantity || 3000),
      reason: body.reason || 'Buyer requested revision',
      revisedAt: new Date().toISOString(),
      revisedByName: 'Merchandiser'
    };
    memoryQtyRevisions[styleId] = [...prev, rev];
    return NextResponse.json({ success: true, message: 'Quantity revised', revision: rev });
  }

  return NextResponse.json({ success: true, ...body });
}
