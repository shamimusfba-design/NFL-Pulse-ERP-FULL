import { NextRequest, NextResponse } from 'next/server';
import { parseBuyerPoFile } from '../../../lib/buyer-po-parser';
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
let memoryCreatedJobs: any[] = [];
let memoryJobWorkflowStates: Record<string, any> = {};
let memoryTasks: any[] = [
  { id: 't-1', title: 'Batch Topping & Shade Rectification', module: 'dyeing', department: 'Dyeing', priority: 'HIGH', status: 'PENDING', dueAt: '2026-10-03', order: { jobNo: '48085', buyer: { name: 'BS-NMT' } } },
  { id: 't-2', title: 'PP Sample Fabric Approval for Name It', module: 'merchandising', department: 'Merchandising', priority: 'CRITICAL', status: 'PENDING', dueAt: '2026-10-02', order: { jobNo: '48061', buyer: { name: 'Name It' } } },
  { id: 't-3', title: 'Line 14B Shifting Manpower Balancing', module: 'sewing', department: 'Sewing', priority: 'HIGH', status: 'IN_PROGRESS', dueAt: '2026-10-02', order: { jobNo: '46755', buyer: { name: 'OVS' } } },
  { id: 't-4', title: 'AOP Strike-off Dispatch to Unifill', module: 'dyeing', department: 'Dyeing', priority: 'NORMAL', status: 'PENDING', dueAt: '2026-10-04', order: { jobNo: '48002', buyer: { name: 'ONLY' } } },
  { id: 't-5', title: 'Yarn Lot Quality Test Report Verification', module: 'yarn-store', department: 'Yarn Store', priority: 'NORMAL', status: 'COMPLETED', dueAt: '2026-10-01', order: { jobNo: '46758', buyer: { name: 'UTG' } } }
];
let memoryStyleFollowUps: Record<string, any> = {};
let memoryQtyRevisions: Record<string, any[]> = {};
let memoryCompletedActionIds: Set<string> = new Set();
let memoryCustomStyles: any[] = [];
let memoryUpdatedStyles: Record<string, any> = {};
let memoryCompanyForms: Record<string, any[]> = {};

function createSmsSampleForm(job: any, formId?: string, lotId?: string) {
  const jobNo = job?.jobNo || '46755';
  const id = formId || `doc-${jobNo}-sms`;
  const gsm = job?.fabric?.gsm || '240';
  const fabType = job?.fabric?.fabricType || 'Cotton Fleece';
  const color = job?.fabric?.colors || 'Standard Dye';
  const exFact = job?.dates?.exFactory || '2026-08-05';
  const poRecv = job?.dates?.poReceived || '2026-01-21';

  return {
    id,
    type: 'SMS_SAMPLE_ORDER',
    templateVersion: 'v1.2 Company Standard',
    status: 'READY_TO_PRINT',
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      buyer: job?.buyer || 'OVS',
      jobNo: job?.jobNo || '46755',
      styleNo: job?.styleNo || '262SWT028-222',
      styleName: job?.item || 'Sweat Shirt',
      collection: job?.planMonth || 'Autumn/Winter 2026',
      collNo: 'AW-26',
      garmentDescription: job?.itemDescription || 'LS Swt shirt w back pleat and slve frings',
      totalOrderQty: job?.orderQty || 6501,
      dateOfIssue: new Date().toISOString().split('T')[0],
      merchandiser: job?.merchandiser || 'Shaker',
      sampleType: 'Salesman Sample (SMS)',
      receivedBy: 'Sample Room In-Charge (Md. Rafiqul)',
      specificInstructions: 'Wash as per buyer manual; shrinkage allowance +4% length, +3% width. Ensure high color fastness and softness.',
      buyerSampleOrders: [
        { receivedDate: poRecv, orderNo: `SMS-${jobNo}-01`, qty: 24 },
        { receivedDate: poRecv, orderNo: `SMS-${jobNo}-02`, qty: 12 }
      ],
      fabricRows: [
        {
          styleRef: job?.styleNo,
          part: 'Body',
          gsmFabricDescription: `${gsm} GSM ${fabType}`,
          composition: '100% Combed Cotton',
          colorCode: color,
          garmentDescription: job?.itemDescription,
          bodyFabricQty: '24 Pcs',
          totalKgs: '18.5',
          size: 'M / L',
          sampleQty: 24,
          exFactoryDate: exFact,
          remarks: 'Approval required before cutting bulk'
        },
        {
          styleRef: job?.styleNo,
          part: 'Neck Rib & Cuff',
          gsmFabricDescription: '260 GSM 1x1 95/5 Cotton Rib',
          composition: '95% Cotton 5% Elastane',
          colorCode: color,
          garmentDescription: job?.itemDescription,
          bodyFabricQty: '24 Pcs',
          totalKgs: '3.2',
          size: 'M / L',
          sampleQty: 24,
          exFactoryDate: exFact,
          remarks: 'Matched to body shade'
        }
      ],
      sampleTa: [
        { activity: 'Yarn In-house', start: '2026-02-01', end: '2026-02-05' },
        { activity: 'Knitting', start: '2026-02-06', end: '2026-02-10' },
        { activity: 'Dyeing', start: '2026-02-11', end: '2026-02-16' },
        { activity: 'Sample Making', start: '2026-02-17', end: '2026-02-22' },
        { activity: 'Dispatch', start: '2026-02-23', end: '2026-02-25' }
      ],
      preparedBy: job?.merchandiser || 'Shaker',
      checkedBy: 'Team Leader (Sample)',
      authorisedBy: 'DGM (IE&P)'
    }
  };
}

function createTnaPlanForm(job: any, formId?: string, lotId?: string) {
  const jobNo = job?.jobNo || '46755';
  const id = formId || `doc-${jobNo}-tna`;
  const gsm = job?.fabric?.gsm || '300';
  const fabType = job?.fabric?.fabricType || 'Fleece';
  const fabReqKg = job?.fabric?.fabricReqKg || 2930;
  const poRecv = job?.dates?.poReceived || '2026-01-21';
  const exFact = job?.dates?.exFactory || '2026-08-05';

  return {
    id,
    type: 'TNA_PLAN',
    templateVersion: 'v1.2 Company Standard',
    status: 'APPROVED',
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      buyer: job?.buyer || 'OVS',
      jobNo: job?.jobNo || '46755',
      styleNo: job?.styleNo || '262SWT028-222',
      styleName: job?.item || 'Swt Shirt',
      collection: job?.planMonth || '01-Aug-2026',
      collNo: 'AW-26',
      garmentDescription: job?.itemDescription || 'LS Swt shirt w back pleat and slve frings',
      totalOrderQty: job?.orderQty || 6501,
      dateOfIssue: new Date().toISOString().split('T')[0],
      merchandiser: job?.merchandiser || 'Shaker',
      poReceivedDate: poRecv,
      printEmb: 'Chest Artwork + Back Pleat Detailing',
      fabricDescription: `${gsm} GSM ${fabType}`,
      totalFabricQtyKg: fabReqKg,
      orderBasis: 'FINISHED_GOODS',
      poRows: [
        { reference: `PO-${jobNo}-001`, poNumber: `PO-${jobNo}-001`, referenceType: 'PO', qty: job?.orderQty || 6501, shipDate: exFact }
      ],
      planRows: [
        { activity: 'Order Confirmation & Master Booking', start: '2026-01-22', end: '2026-01-28', processingDays: 6, slackDays: 1 },
        { activity: 'Lab Dip / Strike-Off Approval', start: '2026-01-29', end: '2026-02-14', processingDays: 16, slackDays: 2 },
        { activity: 'Yarn In-house & Testing', start: '2026-02-15', end: '2026-03-08', processingDays: 21, slackDays: 2 },
        { activity: 'Knitting Execution', start: '2026-03-09', end: '2026-03-30', processingDays: 21, slackDays: 1 },
        { activity: 'Dyeing & Finishing', start: '2026-04-01', end: '2026-04-25', processingDays: 24, slackDays: 2 },
        { activity: 'Bulk Fabric Delivery & QC Inspection', start: '2026-04-26', end: '2026-05-05', processingDays: 9, slackDays: 1 },
        { activity: 'PP Sample Submission & Buyer Comments', start: '2026-05-06', end: '2026-05-20', processingDays: 14, slackDays: 2 },
        { activity: 'CAD Marker & Size Set Handover', start: '2026-05-21', end: '2026-05-28', processingDays: 7, slackDays: 1 },
        { activity: 'Cutting Production', start: job?.dates?.cuttingStart || '2026-07-10', end: job?.dates?.cuttingEnd || '2026-07-13', processingDays: 3, slackDays: 1 },
        { activity: 'Sewing Production', start: job?.dates?.sewingStart || '2026-07-15', end: job?.dates?.sewingEnd || '2026-07-18', processingDays: 3, slackDays: 1 },
        { activity: 'Final Inspection & Ex-Factory', start: exFact, end: job?.dates?.cargoClosing || '2026-08-07', processingDays: 2, slackDays: 0 }
      ],
      planningDepartment: 'Kamrul Hassan (Sr. Planning Executive)',
      merchandiserSign: job?.merchandiser || 'Shaker'
    }
  };
}

function createBulkFabricForm(job: any, formId?: string, lotId?: string) {
  const jobNo = job?.jobNo || '46755';
  const id = formId || `doc-${jobNo}-bulk-fabric`;
  const gsm = job?.fabric?.gsm || '300';
  const fabType = job?.fabric?.fabricType || 'Fleece';
  const fabReqKg = job?.fabric?.fabricReqKg || 2930;
  const widthDia = job?.fabric?.widthDia || '76"';
  const color = job?.fabric?.colors || 'Black Beauty';
  const totalQty = job?.orderQty || 6501;
  const poRecv = job?.dates?.poReceived || '2026-01-21';
  const closing = job?.dates?.cargoClosing || '2026-08-07';
  const exFact = job?.dates?.exFactory || '2026-08-05';

  const bodyKg = Math.round(fabReqKg * 0.92);
  const ribKg = Math.round(fabReqKg * 0.08);

  const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
  const sizeBreakdown = [
    {
      colorCode: color,
      sizes: {
        XS: Math.round(totalQty * 0.10),
        S: Math.round(totalQty * 0.22),
        M: Math.round(totalQty * 0.32),
        L: Math.round(totalQty * 0.22),
        XL: Math.round(totalQty * 0.10),
        '2XL': Math.round(totalQty * 0.04)
      },
      total: totalQty,
      packingAssort: 'Ratio Pack 1:2:3:2:1:1'
    }
  ];

  return {
    id,
    type: 'BULK_FABRIC_ORDER',
    templateVersion: 'v1.2 Company Standard',
    status: 'APPROVED',
    revision: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      buyer: job?.buyer || 'OVS',
      jobNo: job?.jobNo || '46755',
      styleNo: job?.styleNo || '262SWT028-222',
      styleName: job?.item || 'Swt Shirt',
      collection: job?.planMonth || '01-Aug-2026',
      collNo: 'AW-26',
      garmentDescription: job?.itemDescription || 'LS Swt shirt w back pleat and slve frings',
      totalOrderQty: totalQty,
      dateOfIssue: new Date().toISOString().split('T')[0],
      merchandiser: job?.merchandiser || 'Shaker',
      toDepartment: 'Knitting & Dyeing Div. (NFL)',
      deliveryClosingDate: closing,
      poReceivedDate: poRecv,
      orderBasis: 'FINISHED_GOODS',
      poRows: [
        { reference: `PO-${jobNo}-001`, poNumber: `PO-${jobNo}-001`, referenceType: 'PO', qty: totalQty, shipDate: exFact }
      ],
      fabricWidthColumns: [
        { key: 'W1', width: widthDia, cm: '193.04 cm', requirement: 'Body Fabric Req. (Kgs)' },
        { key: 'W2', width: '56”', cm: '142.24 cm', requirement: 'Rib Req. (Kgs)' }
      ],
      fabricRows: [
        {
          part: 'Body',
          gsmFabricDescription: `${gsm} GSM ${fabType}`,
          composition: '100% Cotton',
          colorCode: color,
          widthQty: { W1: bodyKg, W2: '' },
          totalKg: bodyKg
        },
        {
          part: 'Rib',
          gsmFabricDescription: '260 GSM 1x1 95/5 Cotton Spandex Rib',
          composition: '95% Cotton 5% Elastane',
          colorCode: color,
          widthQty: { W1: '', W2: ribKg },
          totalKg: ribKg
        }
      ],
      sizeColumns: sizes,
      sizeBreakdown,
      consumption: {
        allBody: '2.54',
        neckTape: '0.12',
        neckBinding: '0.18',
        avgConsumption: '2.84'
      },
      preparedBy: job?.merchandiser || 'Shaker',
      checkedBy: 'Team Leader (Bulk Merch)',
      authorisedBy: 'DGM (P&IE/S&M)'
    }
  };
}

function getOrInitFormsForStyle(styleId: string) {
  if (memoryCompanyForms[styleId] && memoryCompanyForms[styleId].length > 0) {
    return memoryCompanyForms[styleId];
  }
  const jobNo = styleId.replace('style-', '');
  const job = masterJobs.find((j: any) => String(j.jobNo) === String(jobNo)) || masterJobs[0];
  const initial = [
    createSmsSampleForm(job, `doc-${job.jobNo}-sms`),
    createTnaPlanForm(job, `doc-${job.jobNo}-tna`),
    createBulkFabricForm(job, `doc-${job.jobNo}-bulk-fabric`)
  ];
  memoryCompanyForms[styleId] = initial;
  return initial;
}

function createNewFormForStyle(styleId: string, type: string, productionLotId?: string) {
  const jobNo = styleId.replace('style-', '');
  const job = masterJobs.find((j: any) => String(j.jobNo) === String(jobNo)) || masterJobs[0];
  const uniqueSuffix = Date.now().toString().slice(-4);
  if (type === 'SMS_SAMPLE_ORDER') {
    const form = createSmsSampleForm(job, `doc-${job.jobNo}-sms-${uniqueSuffix}`, productionLotId);
    form.status = 'DRAFT';
    return form;
  }
  if (type === 'BULK_FABRIC_ORDER') {
    const form = createBulkFabricForm(job, `doc-${job.jobNo}-bulk-${uniqueSuffix}`, productionLotId);
    form.status = 'DRAFT';
    return form;
  }
  const form = createTnaPlanForm(job, `doc-${job.jobNo}-tna-${uniqueSuffix}`, productionLotId);
  form.status = 'DRAFT';
  return form;
}
let memoryCostSheets: any[] = [
  {
    id: 'cs-22014574',
    version: 1,
    approvalStatus: 'APPROVED',
    header: {
      garmentDescription: 'onsAB REG AOP TEE',
      buyer: 'ONS',
      divGroup: 'Mens',
      orderQty: 5000,
      styleRef: '22014574',
      date: '12.11.18',
      season: 'Autumn/Winter',
      currency: 'USD'
    },
    fabrics: [
      {
        id: 'fab-1',
        fabricTag: 'Fabric A',
        fabricDescription: '100% Cotton Single Jersey AOP',
        bWidth: 68,
        bLength: 72,
        slCm: 22,
        mqPc: 1,
        consumptionKg: 0.22,
        wastePct: 8,
        totalConsumptionKg: 0.238,
        dozen: 2.85,
        gsm: 160,
        formula: '(Length+Allow)×(Width+Allow)×GSM×12/10000000',
        wastageKg: 0.018,
        knittingCost: 0.45,
        dyeingFinishingCost: 1.15,
        convertCost: 0.20
      },
      {
        id: 'fab-2',
        fabricTag: 'Fabric B',
        fabricDescription: '95/5 Cotton Spandex 1x1 Neck Rib',
        bWidth: 4,
        bLength: 48,
        slCm: 0,
        mqPc: 1,
        consumptionKg: 0.025,
        wastePct: 10,
        totalConsumptionKg: 0.028,
        dozen: 0.33,
        gsm: 220,
        formula: 'Rib Formula',
        wastageKg: 0.003,
        knittingCost: 0.55,
        dyeingFinishingCost: 1.25,
        convertCost: 0.15
      }
    ],
    fabricACost: {
      yarnPricePerKg: 3.85,
      yarnPriceExtraPerKg: 0,
      knittingCostPerKg: 0.45,
      aopOilDyePerKg: 0.95,
      dyeingFinishingPerKg: 1.15,
      brushedPerKg: 0,
      wastageKnittingDyeingPerKg: 0.25,
      totalCostFabricAPerKg: 6.65
    },
    fabricBCost: {
      yarnPricePerKg: 4.20,
      spandexPerKg: 0.40,
      knittingCostPerKg: 0.55,
      yarnDyeingPerKg: 0,
      carbonizedPerKg: 0,
      wastageKnittingDyeingPerKg: 0.30,
      totalCostFabricBPerKg: 5.45
    },
    fabricCCost: {
      yarnPricePerKg: 0,
      knittingCostPerKg: 0,
      dyeingFinishingPerKg: 0,
      wastageKnittingDyeingPerKg: 0,
      totalCostFabricCPerKg: 0
    },
    accessories: [
      { id: 'acc-1', item: 'Main Label', supplier: 'Avery', costPerDzn: 0.36, costPerPc: 0.03 },
      { id: 'acc-2', item: 'Care Label', supplier: 'Paxar', costPerDzn: 0.24, costPerPc: 0.02 },
      { id: 'acc-3', item: 'Hang Tag', supplier: 'Avery', costPerDzn: 0.60, costPerPc: 0.05 },
      { id: 'acc-4', item: 'Price Tag', supplier: 'Buyer Nominated', costPerDzn: 0.36, costPerPc: 0.03 },
      { id: 'acc-5', item: 'Poly Bag', supplier: 'Local Pack', costPerDzn: 0.48, costPerPc: 0.04 },
      { id: 'acc-6', item: 'Sewing Thread', supplier: 'Coats', costPerDzn: 0.72, costPerPc: 0.06 },
      { id: 'acc-7', item: 'Carton (7-ply)', supplier: 'In-house', costPerDzn: 0.96, costPerPc: 0.08 },
      { id: 'acc-8', item: 'Others / Flag Label', supplier: 'Local', costPerDzn: 0.24, costPerPc: 0.02 }
    ],
    otherCosts: {
      collarCuffPerPc: 0.15,
      totalFabricCostPerPc: 1.73,
      cmCuttingMakingPerPc: 0.92,
      screenPrintPerPc: 0.00,
      embroideryPerPc: 0.00,
      sequinPerPc: 0.00,
      stonePerPc: 0.00,
      garmentWashPerPc: 0.06,
      accessoriesPerPc: 0.33,
      smsPerPc: 0.04,
      commercialOverheadPct: 3.5,
      commercialOverheadPerPc: 0.113,
      profitPct: 8.0,
      profitPerPc: 0.267,
      buyingCommissionPct: 5.0,
      buyingCommissionPerPc: 0.18,
      chemicalTestPerPc: 0.04,
      totalGarmentPriceFobPerPc: 3.78
    },
    revisions: [
      {
        version: 1,
        revisedAt: '12-Nov-2018',
        revisedBy: 'Shamim Hossain',
        reason: 'Initial costing for salesman sample quotation',
        fobPrice: 3.78,
        changedValues: 'Base consumption & yarn quotation',
        approvalStatus: 'APPROVED'
      }
    ],
    approvalHistory: [
      { status: 'SUBMITTED', changedAt: '12-Nov-2018 10:30', actor: 'Shamim Hossain', remarks: 'Submitted for manager approval' },
      { status: 'APPROVED', changedAt: '12-Nov-2018 14:15', actor: 'Tariqul Islam', remarks: 'FOB $3.78 approved for buyer ONS' }
    ],
    createdAt: '2018-11-12T10:00:00Z',
    updatedAt: '2018-11-12T14:15:00Z'
  }
];

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

function inferCategory(item?: string, desc?: string): string {
  const text = `${item || ''} ${desc || ''}`.toLowerCase();
  if (text.includes('polo')) return 'Polo';
  if (text.includes('hood') || text.includes('fleece')) return 'Hoodie';
  if (text.includes('swt') || text.includes('sweat')) return 'Sweatshirt';
  if (text.includes('jacket') || text.includes('cardigan')) return 'Jacket';
  if (text.includes('trouser') || text.includes('pant') || text.includes('jogger')) return 'Trouser';
  if (text.includes('leg') || text.includes('legging')) return 'Legging';
  if (text.includes('kid') || text.includes('infant') || text.includes('baby')) return 'Kidswear';
  if (text.includes('tank') || text.includes('vest')) return 'Tank Top';
  return 'T-Shirt';
}

function getAllConsolidatedStyles(): any[] {
  const styleMap = new Map<string, any>();

  for (const j of masterJobs) {
    const key = `${j.styleNo}__${j.buyer}`;
    if (!styleMap.has(key)) {
      const cat = inferCategory(j.item, j.itemDescription);
      const isKid = j.buyer === 'Name It';
      const isWomen = j.buyer === 'ONLY' || j.buyer === 'Miss Selfridge' || j.buyer === 'Maurices';
      const dept = isKid ? 'Kids' : isWomen ? 'Womenswear' : 'Menswear';
      const brand = j.buyer === 'ONLY' ? 'ONLY Blue' : j.buyer === 'Name It' ? 'Name It Kids' : j.buyer === 'OVS' ? 'OVS Italian' : j.buyer;

      styleMap.set(key, {
        id: `sty-${j.styleNo}`,
        styleNo: j.styleNo,
        buyer: j.buyer,
        styleName: j.itemDescription || j.item || `Style ${j.styleNo}`,
        buyerStyleNo: `BY-${j.styleNo}`,
        product: j.item || 'Apparel',
        category: cat,
        season: j.planMonth ? `AW ${j.planMonth.slice(-4)}` : 'AW 2026',
        brand,
        department: dept,
        customerReference: `REF-${j.styleNo}`,
        status: (j.presentStatus === 'Completed' || j.overallStage === 'Shipment') ? 'COMPLETED' :
                (j.presentStatus === 'In Production' || j.presentStatus === 'Sewing') ? 'RUNNING' :
                (j.presentStatus === 'Cut OK') ? 'CONFIRMED' : 'ACTIVE',
        orderQty: Number(j.orderQty || 0),
        fobPrice: 5.25,
        fobValue: Math.round(Number(j.orderQty || 0) * 5.25),
        smv: Number(j.ie?.smv || 8.5),
        fabricType: j.fabric?.fabricType ? `${j.fabric.fabricType} ${j.fabric.gsm || '180'} GSM` : '100% Cotton Single Jersey 180 GSM',
        gsm: j.fabric?.gsm || '180',
        colors: j.fabric?.colors ? [j.fabric.colors] : ['Optical White', 'Black Beauty'],
        sizes: isKid ? ['92', '98', '104', '110', '116', '122', '128'] : ['XS', 'S', 'M', 'L', 'XL', '2XL'],
        sizeRatio: isKid ? [1, 2, 2, 3, 3, 2, 1] : [1, 2, 3, 3, 2, 1],
        linkedJobs: [{
          jobNo: j.jobNo,
          poNo: `PO-${j.jobNo}`,
          orderQty: j.orderQty,
          shipmentDate: j.dates?.exFactory || '21-Oct-2026',
          status: j.presentStatus || 'Running',
          factory: j.lineAllocation?.factory || 'NFL'
        }],
        techPackStatus: 'APPROVED',
        cadPatternStatus: 'APPROVED',
        sampleStatus: { proto: 'APPROVED', fit: 'APPROVED', pp: (j.presentStatus?.includes('Sewing') || j.presentStatus?.includes('Cut')) ? 'APPROVED' : 'SUBMITTED' },
        revisions: [
          { revNo: 'Rev 0', date: j.dates?.poReceived || '01-Aug-2026', by: j.merchandiser || 'Shamim Hossain', remarks: 'Initial Tech Pack Release' },
          { revNo: 'Rev 1', date: j.dates?.cuttingStart || '15-Aug-2026', by: 'Pattern Master', remarks: 'Neck drop and sleeve hem grading adjustment' }
        ],
        specMeasurements: [
          { pom: 'Chest Width (1" below armhole)', tol: '±0.5 cm', xs: 48, s: 50, m: 53, l: 56, xl: 59, xxl: 62 },
          { pom: 'Body Length (HPS to bottom)', tol: '±1.0 cm', xs: 68, s: 70, m: 72, l: 74, xl: 76, xxl: 78 },
          { pom: 'Across Shoulder', tol: '±0.5 cm', xs: 41, s: 43, m: 45, l: 47, xl: 49, xxl: 51 },
          { pom: 'Sleeve Length from shoulder', tol: '±0.5 cm', xs: 61, s: 62.5, m: 64, l: 65.5, xl: 67, xxl: 68.5 },
          { pom: 'Bottom Hem Width', tol: '±0.5 cm', xs: 47, s: 49, m: 52, l: 55, xl: 58, xxl: 61 },
          { pom: 'Neck Width (seam to seam)', tol: '±0.3 cm', xs: 17, s: 17.5, m: 18, l: 18.5, xl: 19, xxl: 19.5 },
          { pom: 'Front Neck Drop', tol: '±0.3 cm', xs: 8.5, s: 9, m: 9.5, l: 10, xl: 10.5, xxl: 11 }
        ],
        bomItems: [
          { category: 'Main Fabric', item: j.fabric?.fabricType || '100% Cotton Single Jersey', supplier: 'In-House (NFL Knitting & Dyeing)', consumption: '0.24 kg/pc', color: 'Matching Ground', status: 'IN_HOUSE' },
          { category: 'Sewing Thread', item: '100% Spun Polyester 40/2 & 50/2', supplier: 'Coats Bangladesh', consumption: '110 m/pc', color: 'Dyed to Match', status: 'IN_HOUSE' },
          { category: 'Labels', item: 'Heat Transfer Satin Main Neck Label', supplier: 'Avery Dennison', consumption: '1 pc/pc', color: 'White/Navy', status: 'APPROVED' },
          { category: 'Labels', item: 'Printed Care & Composition Label', supplier: 'Paxar / Checkpoint', consumption: '1 pc/pc', color: 'White/Black', status: 'APPROVED' },
          { category: 'Packaging', item: 'Self-Adhesive Recycled Polybag', supplier: 'Local Certified', consumption: '1 pc/pc', color: 'Clear / Printed Warning', status: 'IN_HOUSE' },
          { category: 'Packaging', item: '5-Ply Master Carton Box (60x40x30cm)', supplier: 'Sonali Paper & Board', consumption: '0.02 ctn/pc', color: 'Brown Kraft', status: 'IN_HOUSE' }
        ],
        samples: [
          { type: 'Proto Sample', submissionDate: '15-Jul-2026', approvalDate: '22-Jul-2026', status: 'APPROVED', comments: 'Body fit approved. Proceed to fit sample.' },
          { type: 'Fit Sample', submissionDate: '01-Aug-2026', approvalDate: '08-Aug-2026', status: 'APPROVED', comments: 'Minor adjustment to neck rib height accepted.' },
          { type: 'Size Set', submissionDate: '15-Aug-2026', approvalDate: '20-Aug-2026', status: 'APPROVED', comments: 'Grading across sizes verified and approved.' },
          { type: 'Pre-Production (PP)', submissionDate: '28-Aug-2026', approvalDate: '02-Sep-2026', status: 'APPROVED', comments: 'Bulk production cut authorized.' }
        ]
      });
    } else {
      const existing = styleMap.get(key);
      existing.orderQty += Number(j.orderQty || 0);
      existing.fobValue += Math.round(Number(j.orderQty || 0) * 5.25);
      existing.linkedJobs.push({
        jobNo: j.jobNo,
        poNo: `PO-${j.jobNo}`,
        orderQty: j.orderQty,
        shipmentDate: j.dates?.exFactory || '21-Oct-2026',
        status: j.presentStatus || 'Running',
        factory: j.lineAllocation?.factory || 'NFL'
      });
      if (j.fabric?.colors && !existing.colors.includes(j.fabric.colors)) {
        existing.colors.push(j.fabric.colors);
      }
    }
  }

  const allStyles: any[] = [...memoryCustomStyles];
  for (const [, item] of styleMap.entries()) {
    const updated = memoryUpdatedStyles[item.styleNo] || {};
    allStyles.push({ ...item, ...updated });
  }

  return allStyles;
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

    // 3. Calculate Real KPIs & Two Distinct Sets of Counts (Order Status vs Pending Work)
    const totalOrders = filtered.length;
    const totalPOs = Math.round(totalOrders * 2.05);
    const totalOrderQty = filtered.reduce((s: number, j: any) => s + Number(j.orderQty || 0), 0);
    const totalFobValue = Math.round(totalOrderQty * 5.25);
    const atRiskCount = filtered.filter((j: any) => {
      const r = calculateJobRisk(j);
      return r.level === 'AT_RISK' || r.level === 'CRITICAL';
    }).length;
    const onTimeShipmentPct = totalOrders > 0 ? Math.round(((totalOrders - atRiskCount) / totalOrders) * 100) : 96;

    // 3a. Order Status Counts (Counting unique orders only)
    const confirmedOrders = filtered.filter((j: any) => {
      const ps = String(j.presentStatus || '').toLowerCase();
      return ps.includes('confirmed') || ps.includes('cut ok') || ps.includes('plan');
    }).length;

    const inProgressOrders = filtered.filter((j: any) => {
      const ps = String(j.presentStatus || '').toLowerCase();
      return ps.includes('sewing') || ps.includes('cut') || ps.includes('production') || ps.includes('running');
    }).length;

    const delayedOrders = filtered.filter((j: any) => {
      const ex = parseMasterDate(j.dates?.exFactory);
      const diff = ex ? Math.ceil((ex.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 0;
      const ps = String(j.presentStatus || '').toLowerCase();
      return diff < 0 || ps.includes('delay') || ps.includes('hold');
    }).length;

    const completedOrders = filtered.filter((j: any) => {
      const ps = String(j.presentStatus || '').toLowerCase();
      return ps.includes('ship') || ps.includes('complete');
    }).length;

    const cancelledOrders = filtered.filter((j: any) => {
      const ps = String(j.presentStatus || '').toLowerCase();
      return ps.includes('cancel');
    }).length;

    // 3b. Merchandising Pending Work / Due Actions (Counting unique jobs with pending tasks - NEVER mixed with orders!)
    const fabricOrderSheetDue = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog < 0.40; // Early stages where FOS is being prepared/submitted
    }).length;

    const trimsOrderingDue = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog < 0.50; // Trims package follow-up active
    }).length;

    const yarnRequirementDue = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog < 0.35; // Spinning mill requisition and yarn lot allocation pending
    }).length;

    const shadeColorApprovalDue = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog < 0.45; // Lab dip / strike-off approval pending
    }).length;

    const taCriticalDue = filtered.filter((j: any) => {
      const r = calculateJobRisk(j);
      return r.level === 'AT_RISK' || r.level === 'CRITICAL';
    }).length;

    const ppSamplePending = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog >= 0.15 && prog < 0.40;
    }).length;

    const ppCommentsPending = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog >= 0.25 && prog < 0.50;
    }).length;

    const cadHandoverPending = filtered.filter((j: any) => {
      // Rule: Receiving PP Comments triggers CAD Handover!
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog >= 0.30 && prog < 0.55;
    }).length;

    const cadProcessPending = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog >= 0.35 && prog < 0.60;
    }).length;

    const sizeSetDue = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog >= 0.40 && prog < 0.65;
    }).length;

    const ttMeetingPending = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog >= 0.45 && prog < 0.70;
    }).length;

    const productionFollowUpDue = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog >= 0.50 && prog < 0.95;
    }).length;

    const packingListPending = filtered.filter((j: any) => {
      const prog = Number(j.sewing?.sewingActualQty || 0) / (Number(j.orderQty) || 1);
      return prog >= 0.75 && prog < 1.0;
    }).length;

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
      orderStatusCounts: {
        allOrders: totalOrders,
        confirmed: confirmedOrders,
        inProgress: inProgressOrders,
        atRisk: atRiskCount,
        delayed: delayedOrders,
        completed: completedOrders,
        cancelled: cancelledOrders
      },
      pendingWorkCounts: {
        fabricOrderSheetDue,
        trimsOrderingDue,
        yarnRequirementDue,
        shadeColorApprovalDue,
        taCriticalDue,
        ppSamplePending,
        ppCommentsPending,
        cadHandoverPending,
        cadProcessPending,
        sizeSetDue,
        ttMeetingPending,
        productionFollowUpDue,
        packingListPending
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

  // 0d. /api/merchandising/styles
  if (pathStr === 'merchandising/styles') {
    const role = (url.searchParams.get('role') || 'MERCHANDISER').toUpperCase();
    const assignedBuyer = url.searchParams.get('assignedBuyer') || 'ONLY';
    const isHead = role === 'HEAD_MERCHANDISER' || role === 'ADMIN';

    let effectiveBuyer = isHead ? (url.searchParams.get('buyer') || 'ALL') : assignedBuyer;
    const statusFilter = url.searchParams.get('status') || 'ALL';
    const categoryFilter = url.searchParams.get('category') || 'ALL';
    const seasonFilter = url.searchParams.get('season') || 'ALL';
    const deptFilter = url.searchParams.get('department') || 'ALL';
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 25)));

    const allStyles = getAllConsolidatedStyles();

    // 1. Authorization & Buyer Filter
    let filtered = allStyles.filter((s: any) => {
      const b = String(s.buyer || '').toUpperCase();
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

    // 2. Status Filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((s: any) => s.status?.toUpperCase() === statusFilter.toUpperCase());
    }

    // 3. Category Filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((s: any) => s.category?.toUpperCase() === categoryFilter.toUpperCase());
    }

    // 4. Season Filter
    if (seasonFilter !== 'ALL') {
      filtered = filtered.filter((s: any) => s.season?.toUpperCase().includes(seasonFilter.toUpperCase()));
    }

    // 5. Department Filter
    if (deptFilter !== 'ALL') {
      filtered = filtered.filter((s: any) => s.department?.toUpperCase() === deptFilter.toUpperCase());
    }

    // 6. Global Search
    if (search) {
      filtered = filtered.filter((s: any) => {
        const sNo = String(s.styleNo || '').toLowerCase();
        const sName = String(s.styleName || '').toLowerCase();
        const bySNo = String(s.buyerStyleNo || '').toLowerCase();
        const buyer = String(s.buyer || '').toLowerCase();
        const product = String(s.product || '').toLowerCase();
        const cat = String(s.category || '').toLowerCase();
        const season = String(s.season || '').toLowerCase();
        const brand = String(s.brand || '').toLowerCase();
        const ref = String(s.customerReference || '').toLowerCase();
        const colors = (s.colors || []).join(' ').toLowerCase();
        const jobs = (s.linkedJobs || []).map((j: any) => j.jobNo + ' ' + (j.poNo || '')).join(' ').toLowerCase();

        return sNo.includes(search) ||
          sName.includes(search) ||
          bySNo.includes(search) ||
          buyer.includes(search) ||
          product.includes(search) ||
          cat.includes(search) ||
          season.includes(search) ||
          brand.includes(search) ||
          ref.includes(search) ||
          colors.includes(search) ||
          jobs.includes(search);
      });
    }

    // Calculate High-Level KPIs
    const totalStyles = filtered.length;
    const activeBulkStyles = filtered.filter((s: any) => s.status === 'RUNNING' || s.status === 'ACTIVE' || s.status === 'CONFIRMED').length;
    const developmentStyles = filtered.filter((s: any) => s.status === 'DEVELOPMENT').length;
    const totalLinkedJobs = filtered.reduce((acc: number, s: any) => acc + (s.linkedJobs?.length || 0), 0);
    const totalOrderPcs = filtered.reduce((acc: number, s: any) => acc + (s.orderQty || 0), 0);
    const techPackApprovedCount = filtered.filter((s: any) => s.techPackStatus === 'APPROVED').length;
    const techPackApprovedPct = totalStyles > 0 ? Math.round((techPackApprovedCount / totalStyles) * 100) : 100;
    const sampleApprovedCount = filtered.filter((s: any) => s.sampleStatus?.fit === 'APPROVED').length;
    const protoFitApprovedPct = totalStyles > 0 ? Math.round((sampleApprovedCount / totalStyles) * 100) : 95;

    // Distinct Category & Season lists for filters
    const availableCategories = Array.from(new Set(allStyles.map((s: any) => s.category))).filter(Boolean);
    const availableSeasons = Array.from(new Set(allStyles.map((s: any) => s.season))).filter(Boolean);

    // Pagination
    const totalPages = Math.ceil(filtered.length / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      role,
      assignedBuyer,
      effectiveBuyer,
      isHead,
      kpis: {
        totalStyles,
        activeBulkStyles,
        developmentStyles,
        totalLinkedJobs,
        totalOrderPcs,
        techPackApprovedPct,
        protoFitApprovedPct
      },
      availableCategories,
      availableSeasons,
      pagination: {
        page,
        limit,
        totalPages,
        totalRecords: totalStyles
      },
      styles: paginated
    });
  }

  // 0e. /api/merchandising/styles/:id
  if (pathStr.startsWith('merchandising/styles/') && !pathStr.endsWith('/export')) {
    const targetIdOrNo = pathStr.replace('merchandising/styles/', '').trim();
    const allStyles = getAllConsolidatedStyles();
    const found = allStyles.find((s: any) =>
      s.id === targetIdOrNo ||
      s.styleNo === targetIdOrNo ||
      s.id === `sty-${targetIdOrNo}`
    );

    if (!found) {
      return NextResponse.json({ success: false, error: 'Style not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, style: found });
  }

  // 0f. /api/merchandising/styles/export
  if (pathStr === 'merchandising/styles/export') {
    const role = (url.searchParams.get('role') || 'MERCHANDISER').toUpperCase();
    const assignedBuyer = url.searchParams.get('assignedBuyer') || 'ONLY';
    const isHead = role === 'HEAD_MERCHANDISER' || role === 'ADMIN';
    let effectiveBuyer = isHead ? (url.searchParams.get('buyer') || 'ALL') : assignedBuyer;

    const allStyles = getAllConsolidatedStyles();
    let exportStyles = allStyles.filter((s: any) => {
      const b = String(s.buyer || '').toUpperCase();
      if (!isHead) {
        const assigned = assignedBuyer.toUpperCase();
        if (assigned === 'ONLY') return b.includes('ONLY') || b.includes('CARMA');
        return b.includes(assigned) || assigned.includes(b);
      }
      if (effectiveBuyer === 'ALL') return true;
      const eb = effectiveBuyer.toUpperCase();
      return b.includes(eb) || eb.includes(b);
    }).slice(0, 1000);

    const headers = ['Style No', 'Style Name', 'Buyer Style No', 'Buyer', 'Category', 'Season', 'Status', 'Order Qty', 'FOB Price', 'FOB Value', 'SMV', 'Fabric', 'GSM', 'Colors', 'Linked Jobs'];
    const rows = exportStyles.map((s: any) => [
      `"${s.styleNo}"`,
      `"${(s.styleName || '').replace(/"/g, '""')}"`,
      `"${s.buyerStyleNo}"`,
      `"${s.buyer}"`,
      `"${s.category}"`,
      `"${s.season}"`,
      `"${s.status}"`,
      s.orderQty,
      s.fobPrice,
      s.fobValue,
      s.smv,
      `"${(s.fabricType || '').replace(/"/g, '""')}"`,
      `"${s.gsm}"`,
      `"${(s.colors || []).join('; ')}"`,
      `"${(s.linkedJobs || []).map((j: any) => j.jobNo).join('; ')}"`
    ]);

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="nos_style_product_master.csv"'
      }
    });
  }

  // 0g. /api/merchandising/costing
  if (pathStr === 'merchandising/costing') {
    const role = (url.searchParams.get('role') || 'MERCHANDISER').toUpperCase();
    const assignedBuyer = url.searchParams.get('assignedBuyer') || 'ONLY';
    const isHead = role === 'HEAD_MERCHANDISER' || role === 'ADMIN';
    let effectiveBuyer = isHead ? (url.searchParams.get('buyer') || 'ALL') : assignedBuyer;
    const status = url.searchParams.get('status') || 'ALL';
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();

    let filtered = memoryCostSheets.filter((c: any) => {
      const b = String(c.header?.buyer || '').toUpperCase();
      if (!isHead) {
        const assigned = assignedBuyer.toUpperCase();
        if (assigned === 'ONLY') return b.includes('ONLY') || b.includes('CARMA') || b.includes('ONS');
        return b.includes(assigned) || assigned.includes(b);
      }
      if (effectiveBuyer === 'ALL') return true;
      const eb = effectiveBuyer.toUpperCase();
      if (eb === 'ONLY') return b.includes('ONLY') || b.includes('CARMA') || b.includes('ONS');
      return b.includes(eb) || eb.includes(b);
    });

    if (status !== 'ALL') {
      filtered = filtered.filter((c: any) => c.approvalStatus === status);
    }

    if (search) {
      filtered = filtered.filter((c: any) => {
        const text = `${c.header?.styleRef} ${c.header?.garmentDescription} ${c.header?.buyer} ${c.header?.divGroup}`.toLowerCase();
        return text.includes(search);
      });
    }

    return NextResponse.json({
      success: true,
      role,
      assignedBuyer,
      effectiveBuyer,
      isHead,
      costSheets: filtered
    });
  }

  // 0h. /api/merchandising/costing/:id
  if (pathStr.startsWith('merchandising/costing/')) {
    const costSheetId = pathStr.replace('merchandising/costing/', '').trim();
    const found = memoryCostSheets.find((c: any) => c.id === costSheetId || c.header?.styleRef === costSheetId);
    if (!found) {
      return NextResponse.json({ success: false, error: 'Cost sheet not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, costSheet: found });
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

  // 1c. /api/jobs
  if (pathStr === 'jobs') {
    const q = url.searchParams.get('q')?.toLowerCase() || '';
    const section = url.searchParams.get('section') || '';
    const buyer = url.searchParams.get('buyer') || '';
    let all = [...memoryCreatedJobs, ...masterJobs];
    if (q) {
      all = all.filter((j: any) =>
        String(j.jobNo || '').toLowerCase().includes(q) ||
        String(j.styleNo || '').toLowerCase().includes(q) ||
        String(j.buyer || '').toLowerCase().includes(q) ||
        String(j.itemDescription || '').toLowerCase().includes(q)
      );
    }
    if (buyer && buyer !== 'ALL') {
      all = all.filter((j: any) => String(j.buyer).toLowerCase() === buyer.toLowerCase());
    }
    return NextResponse.json({
      success: true,
      total: all.length,
      newJobsCount: memoryCreatedJobs.length,
      jobs: all
    });
  }

  // 1d. /api/jobs/:id
  if (pathStr.startsWith('jobs/')) {
    const jobKey = pathStr.replace('jobs/', '').trim();
    if (jobKey && !jobKey.includes('/')) {
      const cleanKey = jobKey.toLowerCase();
      const found = memoryCreatedJobs.find((j: any) =>
        String(j.jobNo).toLowerCase() === cleanKey ||
        String(j.id).toLowerCase() === cleanKey ||
        cleanKey.includes(String(j.jobNo).toLowerCase())
      ) || masterJobs.find((j: any) =>
        String(j.jobNo).toLowerCase() === cleanKey ||
        String(j.id).toLowerCase() === cleanKey ||
        cleanKey.includes(String(j.jobNo).toLowerCase())
      );

      if (found) {
        const wf = memoryJobWorkflowStates[found.jobNo] || {
          jobNo: found.jobNo,
          buyer: found.buyer,
          styleNo: found.styleNo,
          totalQty: found.orderQty,
          overallStage: found.overallStage || 'T&A / Pre-production',
          presentStatus: found.presentStatus || 'In Progress',
          ieBulletin: {
            status: found.ie?.bulletinStatus === 'RELEASED' ? 'READY_IMPORTED' : 'PENDING',
            bulletinNo: `IE-B-${found.jobNo}`,
            smv: found.ie?.smv || 8.5,
            targetPerHour: found.ie?.targetPerHour || 180,
            operationsCount: 18,
            fileAttached: true,
            fileName: `IE-Bulletin-${found.styleNo}.xlsx`,
            updatedAt: found.ie?.bulletinReleaseDate || null
          },
          cad: {
            status: found.overallStage !== 'T&A / Pre-production' ? 'COMPLETED' : 'PENDING',
            consumptionKgPerDz: 2.65,
            consumptionYards: 1.82,
            markerEfficiencyPct: 86.4,
            markerWidth: '60"',
            completedAt: null
          },
          fabricOrderSheet: {
            status: found.overallStage !== 'T&A / Pre-production' ? 'PLANNING_APPROVED' : 'PENDING_CAD',
            preparedBy: found.merchandiser || 'Md. Jahidul Islam',
            preparedAt: '2026-09-10',
            approvalStatus: found.overallStage !== 'T&A / Pre-production' ? 'APPROVED' : 'PENDING',
            approvedBy: 'Central Planning Head',
            approvedAt: '2026-09-12',
            dispatchedToKnitting: true,
            dispatchedToDyeing: true,
            knitDyeCopySentAt: '2026-09-12T10:00:00Z',
            fabricComposition: found.fabric?.fabricType || '100% Combed Cotton Single Jersey',
            gsm: Number(found.fabric?.gsm || 180),
            requiredFabricKg: found.fabric?.fabricReqKg || 2500
          },
          trims: {
            bomStatus: 'PREPARED_OK',
            orderingStatus: 'ORDER_OK',
            items: [
              { name: '100% Spun Polyester Sewing Thread (Tex 24)', required: '350,000 m', status: 'ORDER_OK', supplier: 'Coats', remarks: 'Order Placed (OK)' },
              { name: 'Woven Main Neck Label', required: `${found.orderQty} pcs`, status: 'ORDER_OK', supplier: 'Avery Dennison', remarks: 'Order Placed (OK)' },
              { name: 'Printed Care Satin Label', required: `${found.orderQty} pcs`, status: 'ORDER_OK', supplier: 'Avery Dennison', remarks: 'Order Placed (OK)' },
              { name: 'Printed Barcode Hangtag + String', required: `${found.orderQty} pcs`, status: 'ORDER_OK', supplier: 'Paxar', remarks: 'Order Placed (OK)' },
              { name: 'Self-adhesive Polybag', required: `${found.orderQty} pcs`, status: 'ORDER_OK', remarks: 'In-house Store Stock OK' },
              { name: '7-ply Export Corrugated Carton', required: `${Math.ceil((found.orderQty || 3000) / 24)} ctns`, status: 'ORDER_OK', remarks: 'Order Placed (OK)' }
            ]
          },
          labShade: {
            status: 'SHADE_OK',
            shades: [
              { color: found.fabric?.colors || 'Primary Color', labDipRef: 'LD-01-OK', shadeStatus: 'SHADE_OK', shadeNote: 'Approved by Buyer Lab' }
            ],
            approvedAt: '2026-09-08',
            approvedBy: 'Lab In-charge'
          },
          tna: {
            status: 'PLANNING_APPROVED',
            preparedBy: found.merchandiser || 'Md. Jahidul Islam',
            preparedAt: found.dates?.poReceived || '2026-09-01',
            printedAt: '2026-09-02',
            approvedBy: 'Central Planning',
            approvedAt: found.dates?.tnaPlan || '2026-09-05',
            milestones: [
              { name: 'PO Received / Data Import', plannedDate: found.dates?.poReceived || '2026-09-01', actualDate: found.dates?.poReceived || '2026-09-01', status: 'DONE' },
              { name: 'CAD Consumption Finalized', plannedDate: '2026-09-05', actualDate: '2026-09-05', status: 'DONE' },
              { name: 'Dyeing Lab Shade Approval', plannedDate: '2026-09-08', actualDate: '2026-09-08', status: 'DONE' },
              { name: 'Trims & Accessories In-House', plannedDate: '2026-09-20', actualDate: '2026-09-20', status: 'DONE' },
              { name: 'Fabric Order Sheet Approval', plannedDate: '2026-09-12', actualDate: '2026-09-12', status: 'DONE' },
              { name: 'Knitting Greige Complete', plannedDate: '2026-09-25', actualDate: '2026-09-25', status: 'DONE' },
              { name: 'Batch Dyeing Complete', plannedDate: '2026-10-02', actualDate: '2026-10-02', status: 'DONE' },
              { name: 'Sewing Line Input', plannedDate: found.dates?.sewingEnd || '2026-10-10', actualDate: '', status: 'IN_PROGRESS' },
              { name: 'Ex-Factory Cargo Handover', plannedDate: found.dates?.exFactory || '2026-11-05', actualDate: '', status: 'PENDING' }
            ]
          },
          sewingPlanning: {
            status: found.lineAllocation?.line ? 'LINE_ALLOCATED' : 'PENDING',
            allocatedLine: found.lineAllocation?.line || '',
            allocatedFloor: found.lineAllocation?.floor || '',
            planStartDate: found.lineAllocation?.planStart || '',
            planEndDate: found.lineAllocation?.planEnd || '',
            targetPerHour: found.ie?.targetPerHour || 180
          }
        };

        const matchingTasks = memoryTasks.filter(t => String(t.jobNo) === String(found.jobNo));
        return NextResponse.json({
          success: true,
          job: found,
          workflow: wf,
          tasks: matchingTasks
        });
      }
      return NextResponse.json({ success: false, error: `Job ${jobKey} not found in ERP register.` }, { status: 404 });
    }
  }

  // 1e. /api/planning/pre-production-status
  if (pathStr === 'planning/pre-production-status') {
    const all = [...memoryCreatedJobs, ...masterJobs];
    const preProdJobs = all.filter((j: any) => {
      const stage = String(j.overallStage || '').toLowerCase();
      const ps = String(j.presentStatus || '').toLowerCase();
      return j.isNewlyImported || stage.includes('pre-production') || stage.includes('t&a') || ps.includes('imported') || ps.includes('pending');
    });

    // Counts requested by user:
    // 1. Total POs imported but fabric order sheet not made
    // 2. Total POs imported but T&A plan not made
    // 3. Total POs imported but sewing line plan not made
    const pendingFabricOrderSheetJobs = preProdJobs.filter((j: any) => {
      const wf = memoryJobWorkflowStates[j.jobNo];
      if (wf) return wf.fabricOrderSheet?.status !== 'PLANNING_APPROVED' && wf.fabricOrderSheet?.status !== 'PREPARED_OK';
      return j.isNewlyImported || !j.fabric?.fabricReceivedKg;
    });

    const pendingTnaJobs = preProdJobs.filter((j: any) => {
      const wf = memoryJobWorkflowStates[j.jobNo];
      if (wf) return wf.tna?.status !== 'PLANNING_APPROVED' && wf.tna?.status !== 'PREPARED_OK';
      return j.isNewlyImported || !j.dates?.tnaPlan;
    });

    const pendingSewingLinePlanJobs = preProdJobs.filter((j: any) => {
      const wf = memoryJobWorkflowStates[j.jobNo];
      if (wf) return !wf.sewingPlanning?.allocatedLine;
      return j.isNewlyImported || !j.lineAllocation?.line || j.lineAllocation?.line.toLowerCase().includes('pending');
    });

    return NextResponse.json({
      success: true,
      totalImported: preProdJobs.length,
      newlyImportedCount: memoryCreatedJobs.length,
      pendingFabricOrderSheetCount: pendingFabricOrderSheetJobs.length,
      pendingTnaPlanCount: pendingTnaJobs.length,
      pendingSewingLinePlanCount: pendingSewingLinePlanJobs.length,
      preProdJobs: preProdJobs.slice(0, 50).map((j: any) => ({
        id: j.id,
        jobNo: j.jobNo,
        buyer: j.buyer,
        styleNo: j.styleNo,
        orderQty: j.orderQty,
        itemDescription: j.itemDescription,
        isNewlyImported: !!j.isNewlyImported,
        presentStatus: j.presentStatus,
        workflow: memoryJobWorkflowStates[j.jobNo] || null
      }))
    });
  }

  // 2. /api/tasks/my or /api/tasks
  if (pathStr === 'tasks/my' || pathStr === 'tasks') {
    const jobNo = url.searchParams.get('jobNo') || '';
    const moduleFilter = url.searchParams.get('module') || '';
    const departmentFilter = url.searchParams.get('department') || '';
    const statusFilter = url.searchParams.get('status') || '';

    let list = [...memoryTasks];
    if (jobNo) {
      list = list.filter((t: any) => String(t.jobNo) === jobNo || String(t.order?.jobNo) === jobNo);
    }
    if (moduleFilter && moduleFilter !== 'ALL') {
      list = list.filter((t: any) => String(t.module).toLowerCase() === moduleFilter.toLowerCase());
    }
    if (departmentFilter && departmentFilter !== 'ALL') {
      list = list.filter((t: any) => String(t.department || '').toLowerCase() === departmentFilter.toLowerCase());
    }
    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter((t: any) => String(t.status) === statusFilter);
    }
    return NextResponse.json(list);
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

  // 32b. /api/documents/styles/:styleId/forms and /api/documents/styles/:styleId/forms/:formId
  if (pathStr.startsWith('documents/styles/') && path.length >= 4 && path[3] === 'forms') {
    const styleId = path[2];
    const forms = getOrInitFormsForStyle(styleId);
    if (path.length === 4) {
      return NextResponse.json({ forms });
    }
    if (path.length === 5) {
      const formId = path[4];
      const form = forms.find((f: any) => f.id === formId) || forms[0];
      if (!form) {
        return NextResponse.json({ error: 'Form not found' }, { status: 404 });
      }
      return NextResponse.json({ form });
    }
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

  // POST /api/documents/styles/:styleId/forms/:formId/sync-order-data
  if (pathStr.startsWith('documents/styles/') && pathStr.includes('/sync-order-data')) {
    const styleId = path[2];
    const formId = path[4];
    const forms = getOrInitFormsForStyle(styleId);
    const form = forms.find((f: any) => f.id === formId) || forms[0];
    if (form) {
      const jobNo = styleId.replace('style-', '');
      const job = masterJobs.find((j: any) => String(j.jobNo) === String(jobNo)) || masterJobs[0];
      form.data = {
        ...form.data,
        totalOrderQty: job.orderQty,
        garmentDescription: job.itemDescription || form.data.garmentDescription,
        merchandiser: job.merchandiser || form.data.merchandiser
      };
      form.revision = (form.revision || 1) + 1;
      form.updatedAt = new Date().toISOString();
      return NextResponse.json(form);
    }
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  // POST /api/documents/styles/:styleId/forms
  if (pathStr.startsWith('documents/styles/') && path.length === 4 && path[3] === 'forms') {
    const styleId = path[2];
    const body = await request.json().catch(() => ({}));
    const newForm = createNewFormForStyle(styleId, body.type || 'SMS_SAMPLE_ORDER', body.productionLotId);
    const existing = getOrInitFormsForStyle(styleId);
    existing.push(newForm);
    memoryCompanyForms[styleId] = existing;
    return NextResponse.json(newForm);
  }

  // 0d-POST. /api/merchandising/styles (Create new master style)
  if (pathStr === 'merchandising/styles') {
    const body = await request.json().catch(() => ({}));
    const styleNo = String(body.styleNo || `STY-${Math.floor(100000 + Math.random() * 900000)}`).trim();
    const buyer = String(body.buyer || 'ONLY').trim();
    const styleName = String(body.styleName || `New Style ${styleNo}`).trim();
    const category = String(body.category || 'T-Shirt').trim();
    const season = String(body.season || 'Autumn/Winter 2026').trim();
    const orderQty = Number(body.orderQty || 20000);
    const fobPrice = Number(body.fobPrice || 5.25);
    const smv = Number(body.smv || 8.5);

    const newStyle = {
      id: `sty-${styleNo}`,
      styleNo,
      buyer,
      styleName,
      buyerStyleNo: body.buyerStyleNo || `BY-${styleNo}`,
      product: body.product || category,
      category,
      season,
      brand: body.brand || `${buyer} Brand`,
      department: body.department || (buyer === 'Name It' ? 'Kids' : 'Womenswear'),
      customerReference: body.customerReference || `REF-${styleNo}`,
      status: body.status || 'DEVELOPMENT',
      orderQty,
      fobPrice,
      fobValue: Math.round(orderQty * fobPrice),
      smv,
      fabricType: body.fabricType || '100% Cotton Single Jersey 180 GSM',
      gsm: body.gsm || '180',
      colors: Array.isArray(body.colors) && body.colors.length > 0 ? body.colors : ['Optical White', 'Navy Blazer'],
      sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : ['XS', 'S', 'M', 'L', 'XL', '2XL'],
      sizeRatio: Array.isArray(body.sizeRatio) && body.sizeRatio.length > 0 ? body.sizeRatio : [1, 2, 3, 3, 2, 1],
      linkedJobs: [],
      techPackStatus: body.techPackStatus || 'APPROVED',
      cadPatternStatus: 'APPROVED',
      sampleStatus: { proto: 'APPROVED', fit: 'SUBMITTED', pp: 'PENDING' },
      revisions: [
        { revNo: 'Rev 0', date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), by: body.merchandiser || 'Merchandiser', remarks: 'New Master Style created' }
      ],
      specMeasurements: [
        { pom: 'Chest Width (1" below armhole)', tol: '±0.5 cm', xs: 48, s: 50, m: 53, l: 56, xl: 59, xxl: 62 },
        { pom: 'Body Length (HPS to bottom)', tol: '±1.0 cm', xs: 68, s: 70, m: 72, l: 74, xl: 76, xxl: 78 },
        { pom: 'Across Shoulder', tol: '±0.5 cm', xs: 41, s: 43, m: 45, l: 47, xl: 49, xxl: 51 },
        { pom: 'Sleeve Length from shoulder', tol: '±0.5 cm', xs: 61, s: 62.5, m: 64, l: 65.5, xl: 67, xxl: 68.5 },
        { pom: 'Bottom Hem Width', tol: '±0.5 cm', xs: 47, s: 49, m: 52, l: 55, xl: 58, xxl: 61 }
      ],
      bomItems: [
        { category: 'Main Fabric', item: body.fabricType || '100% Cotton Single Jersey', supplier: 'In-House (NFL)', consumption: '0.24 kg/pc', color: 'Dyed to Match', status: 'IN_HOUSE' },
        { category: 'Sewing Thread', item: '100% Spun Polyester 40/2', supplier: 'Coats', consumption: '110 m/pc', color: 'Matching Ground', status: 'IN_HOUSE' },
        { category: 'Labels', item: 'Heat Transfer Satin Main Neck Label', supplier: 'Avery Dennison', consumption: '1 pc/pc', color: 'Multi', status: 'APPROVED' },
        { category: 'Labels', item: 'Printed Care & Composition Label', supplier: 'Paxar', consumption: '1 pc/pc', color: 'Black/White', status: 'APPROVED' }
      ],
      samples: [
        { type: 'Proto Sample', submissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), approvalDate: 'Pending', status: 'IN_PROGRESS', comments: 'Sample development under review.' }
      ]
    };

    memoryCustomStyles.unshift(newStyle);
    return NextResponse.json({ success: true, style: newStyle });
  }

  // 0d-IMPORT. /api/merchandising/styles/import (Batch import)
  if (pathStr === 'merchandising/styles/import') {
    const body = await request.json().catch(() => ({}));
    const rawList = Array.isArray(body.styles) ? body.styles : [];
    let count = 0;

    for (const item of rawList) {
      if (!item.styleNo) continue;
      const sNo = String(item.styleNo).trim();
      const newSty = {
        id: `sty-${sNo}`,
        styleNo: sNo,
        buyer: item.buyer || 'ONLY',
        styleName: item.styleName || `Imported Style ${sNo}`,
        buyerStyleNo: item.buyerStyleNo || `BY-${sNo}`,
        product: item.product || 'T-Shirt',
        category: item.category || 'T-Shirt',
        season: item.season || 'Autumn/Winter 2026',
        brand: item.brand || 'Core',
        department: item.department || 'Menswear',
        customerReference: item.customerReference || `REF-${sNo}`,
        status: item.status || 'ACTIVE',
        orderQty: Number(item.orderQty || 15000),
        fobPrice: Number(item.fobPrice || 5.25),
        fobValue: Math.round(Number(item.orderQty || 15000) * Number(item.fobPrice || 5.25)),
        smv: Number(item.smv || 8.5),
        fabricType: item.fabricType || '100% Cotton Single Jersey 180 GSM',
        gsm: item.gsm || '180',
        colors: item.colors ? (Array.isArray(item.colors) ? item.colors : String(item.colors).split(/[,;]/).map(c => c.trim())) : ['Black Beauty'],
        sizes: item.sizes ? (Array.isArray(item.sizes) ? item.sizes : String(item.sizes).split(/[,;]/).map(s => s.trim())) : ['S', 'M', 'L', 'XL'],
        sizeRatio: [1, 2, 2, 1],
        linkedJobs: [],
        techPackStatus: 'APPROVED',
        cadPatternStatus: 'APPROVED',
        sampleStatus: { proto: 'APPROVED', fit: 'APPROVED', pp: 'APPROVED' },
        revisions: [{ revNo: 'Rev 0', date: new Date().toLocaleDateString('en-GB'), by: 'Excel Import', remarks: 'Batch imported from Excel' }]
      };
      memoryCustomStyles.unshift(newSty);
      count++;
    }

    return NextResponse.json({ success: true, importedCount: count });
  }

  // 0d-UPDATE. /api/merchandising/styles/update
  if (pathStr === 'merchandising/styles/update') {
    const body = await request.json().catch(() => ({}));
    const styleNo = String(body.styleNo || '').trim();
    if (!styleNo) {
      return NextResponse.json({ success: false, error: 'styleNo is required' }, { status: 400 });
    }

    const prev = memoryUpdatedStyles[styleNo] || {};
    const updated = {
      ...prev,
      ...body,
      revisions: [
        ...(prev.revisions || []),
        {
          revNo: `Rev ${(prev.revisions?.length || 1) + 1}`,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          by: body.merchandiser || 'Merchandiser',
          remarks: body.updateRemarks || 'Style details updated'
        }
      ]
    };
    memoryUpdatedStyles[styleNo] = updated;

    return NextResponse.json({ success: true, style: updated });
  }

  // 0g-POST. /api/merchandising/costing (Save or update real cost sheet)
  if (pathStr === 'merchandising/costing') {
    const body = await request.json().catch(() => ({}));
    const styleRef = String(body.header?.styleRef || body.styleRef || `REF-${Math.floor(100000 + Math.random() * 900000)}`).trim();
    const existingIndex = memoryCostSheets.findIndex(c => c.header?.styleRef === styleRef || c.id === body.id);

    const now = new Date();
    const dateFormatted = `${now.getDate()}.${now.getMonth() + 1}.${String(now.getFullYear()).slice(2)}`;

    if (existingIndex >= 0) {
      const prev = memoryCostSheets[existingIndex];
      const nextVer = (prev.version || 1) + 1;
      const newRev = {
        version: nextVer,
        revisedAt: dateFormatted,
        revisedBy: body.revisedBy || 'Merchandiser',
        reason: body.revisionReason || 'Updated consumption and rates',
        fobPrice: Number(body.otherCosts?.totalGarmentPriceFobPerPc || body.fobPrice || prev.otherCosts?.totalGarmentPriceFobPerPc || 3.78),
        changedValues: body.changedValues || 'Updated lines',
        approvalStatus: body.approvalStatus || 'SUBMITTED'
      };

      const updated = {
        ...prev,
        ...body,
        version: nextVer,
        approvalStatus: body.approvalStatus || 'SUBMITTED',
        revisions: [...(prev.revisions || []), newRev],
        updatedAt: now.toISOString()
      };
      memoryCostSheets[existingIndex] = updated;
      return NextResponse.json({ success: true, costSheet: updated, message: `Cost sheet updated to version ${nextVer}` });
    } else {
      const newSheet = {
        id: `cs-${styleRef}`,
        version: 1,
        approvalStatus: body.approvalStatus || 'DRAFT',
        header: {
          garmentDescription: body.header?.garmentDescription || 'Knit T-Shirt',
          buyer: body.header?.buyer || 'ONLY',
          divGroup: body.header?.divGroup || 'Mens',
          orderQty: Number(body.header?.orderQty || 5000),
          styleRef,
          date: body.header?.date || dateFormatted,
          season: body.header?.season || 'Spring/Summer',
          currency: 'USD'
        },
        fabrics: body.fabrics || [],
        fabricACost: body.fabricACost || {},
        fabricBCost: body.fabricBCost || {},
        fabricCCost: body.fabricCCost || {},
        accessories: body.accessories || [],
        otherCosts: body.otherCosts || {},
        revisions: [
          {
            version: 1,
            revisedAt: dateFormatted,
            revisedBy: body.revisedBy || 'Merchandiser',
            reason: 'Initial creation',
            fobPrice: Number(body.otherCosts?.totalGarmentPriceFobPerPc || 3.78),
            changedValues: 'Initial cost sheet',
            approvalStatus: body.approvalStatus || 'DRAFT'
          }
        ],
        approvalHistory: [
          { status: body.approvalStatus || 'DRAFT', changedAt: now.toLocaleString(), actor: body.revisedBy || 'Merchandiser', remarks: 'Created sheet' }
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      memoryCostSheets.unshift(newSheet);
      return NextResponse.json({ success: true, costSheet: newSheet, message: 'Cost sheet created successfully' });
    }
  }

  // 0h-POST. /api/merchandising/costing/approval (Approve, reject, or submit cost sheet)
  if (pathStr === 'merchandising/costing/approval') {
    const body = await request.json().catch(() => ({}));
    const { id, styleRef, action, actor, remarks } = body;
    const found = memoryCostSheets.find(c => c.id === id || c.header?.styleRef === styleRef);
    if (!found) {
      return NextResponse.json({ success: false, error: 'Cost sheet not found' }, { status: 404 });
    }

    const validStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : action === 'SUBMIT' ? 'SUBMITTED' : 'UNDER_REVIEW';
    found.approvalStatus = validStatus;
    found.approvalHistory = found.approvalHistory || [];
    found.approvalHistory.push({
      status: validStatus,
      changedAt: new Date().toLocaleString(),
      actor: actor || 'Approver',
      remarks: remarks || `Status transitioned to ${validStatus}`
    });

    return NextResponse.json({ success: true, costSheet: found, message: `Cost sheet status updated to ${validStatus}` });
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
    try {
      const formData = await request.formData();
      const uploaded = formData.get('file');
      const buyerCode = String(formData.get('buyerCode') || request.headers.get('buyerCode') || '');
      if (!(uploaded instanceof File)) {
        return NextResponse.json({ error: 'A buyer PO file (PDF, Excel, or CSV) is required.' }, { status: 400 });
      }
      const result = await parseBuyerPoFile(uploaded, buyerCode);
      return NextResponse.json(result);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'Could not read this order file.' }, { status: 422 });
    }
  }

  if (pathStr === 'orders/import/confirm') {
    const body = await request.json().catch(() => ({}));
    const preview = body.preview;
    if (!preview || !Array.isArray(preview.styles) || preview.styles.length === 0) {
      return NextResponse.json({ success: false, error: 'No extracted PO styles are available to import. Review the PDF and retry.' }, { status: 422 });
    }

    // Recalculate all quantities on the server. Browser-side validation is only a
    // preview aid and must never be trusted as the authority for saved order data.
    const hardErrors: string[] = [];
    for (const style of preview.styles as any[]) {
      const styleNo = String(style.styleNo || '').trim();
      let styleQty = Number(style.totalQty || 0);
      if (!styleNo || styleNo === 'UNKNOWN_STYLE') hardErrors.push('Style/article number is missing or unknown.');

      const sumColors = (colors: any[]) => (colors || []).reduce((sum: number, color: any) =>
        sum + (color?.sizes || []).reduce((qty: number, size: any) => qty + Math.max(0, Number(size?.qty || 0)), 0), 0);
      const styleMatrixQty = sumColors(style.colors || []);

      // If user edited color-size matrix, align styleQty to matrix sum
      if (styleMatrixQty > 0 && (styleQty <= 0 || styleMatrixQty !== styleQty)) {
        style.totalQty = styleMatrixQty;
        styleQty = styleMatrixQty;
      }

      if (!Number.isFinite(styleQty) || styleQty <= 0) hardErrors.push(`${styleNo || 'Style'}: style quantity must be greater than zero.`);

      let refs = Array.isArray(style.orderReferences) ? style.orderReferences : [];
      if (!refs.length) {
        // Auto-create default reference if missing
        refs = [{
          reference: `PO-${styleNo || 'MAIN'}`,
          referenceType: 'PO',
          totalQty: styleQty,
          colors: style.colors || []
        }];
        style.orderReferences = refs;
      }

      // If single reference, ensure it mirrors style total and colors
      if (refs.length === 1) {
        refs[0].totalQty = styleQty;
        refs[0].colors = style.colors || [];
      } else {
        // Multiple references: make sure each reference has colors breakdown populated
        const refSum = refs.reduce((sum: number, ref: any) => sum + Number(ref.totalQty || 0), 0);
        if (refSum !== styleQty && !body.approveNeedReview) {
          hardErrors.push(`${styleNo}: PO / Order / Market total ${refSum} does not match style total ${styleQty}.`);
        }
        for (const ref of refs) {
          const refQty = Number(ref.totalQty || 0);
          const refMatrixQty = sumColors(ref.colors || []);
          if (refMatrixQty !== refQty && refQty > 0 && styleQty > 0) {
            // Synthesize ref colors apportioned from style colors
            const ratio = refQty / styleQty;
            ref.colors = (style.colors || []).map((c: any) => ({
              ...c,
              totalQty: Math.round(Number(c.totalQty || 0) * ratio),
              sizes: (c.sizes || []).map((s: any) => ({
                ...s,
                qty: Math.round(Number(s.qty || 0) * ratio)
              }))
            }));
          }
        }
      }

      const seenRefs = new Set<string>();
      for (const ref of refs) {
        const refName = String(ref.reference || ref.poNumber || '').trim();
        const refKey = refName.toLowerCase();
        if (!refName) hardErrors.push(`${styleNo}: a PO / Order / Market reference is blank.`);
        if (refKey && seenRefs.has(refKey)) hardErrors.push(`${styleNo}: duplicate reference "${refName}".`);
        if (refKey) seenRefs.add(refKey);
        const refQty = Number(ref.totalQty || 0);
        if (!Number.isFinite(refQty) || refQty <= 0) hardErrors.push(`${styleNo} / ${refName || 'reference'}: quantity must be greater than zero.`);
      }
    }
    if (hardErrors.length && !body.approveNeedReview) {
      return NextResponse.json({ success: false, error: 'PO import totals do not reconcile. Correct these fields before confirming.', details: [...new Set(hardErrors)] }, { status: 422 });
    }
    const isExplicitlyValidated = preview.validation?.status === 'VALIDATED';
    if (!isExplicitlyValidated && !body.approveNeedReview) {
      return NextResponse.json({ success: false, error: 'This import needs review approval before it can be saved.' }, { status: 422 });
    }

    const buyerId = String(body.buyerId || '');
    const buyerName = String(preview.buyer || preview.buyerCode || (
      buyerId.toLowerCase().includes('ovs') ? 'OVS' :
      buyerId.toLowerCase().includes('nameit') ? 'Name It' :
      buyerId.toLowerCase().includes('utg') ? 'UTG' :
      buyerId.toLowerCase().includes('sons') ? 'Only & Sons' :
      buyerId.toLowerCase().includes('only') ? 'ONLY' : buyerId || 'Unknown'
    ));
    const isOvs = buyerName.toLowerCase().includes('ovs');
    let newJobNo: string;
    if (body.jobType === 'REPEAT') {
      newJobNo = String(body.repeatBaseJobNo || memoryJobSequence);
    } else {
      memoryJobSequence += 1;
      newJobNo = String(memoryJobSequence);
    }

    const styles = preview.styles.map((style: any, styleIndex: number) => {
      const overallBreakdowns = (style.colors || []).flatMap((color: any) =>
        (color.sizes || []).map((size: any) => ({ color: String(color.color || ''), size: String(size.size || ''), qty: Number(size.qty || 0) }))
      ).filter((item: any) => item.color && item.size && item.qty > 0);
      const pos = (style.orderReferences || []).map((ref: any, refIndex: number) => ({
        poNumber: String(ref.reference || ref.poNumber || ''),
        referenceType: isOvs ? 'MARKET' : 'PO',
        totalQty: Number(ref.totalQty || 0),
        ccd: String(ref.ccd || ''),
        shipmentDate: String(ref.shipmentDate || ''),
        destination: String(ref.destination || ''),
        market: String(ref.market || (isOvs ? ref.reference : '')),
        breakdowns: (ref.colors || []).flatMap((color: any) =>
          (color.sizes || []).map((size: any) => ({ color: String(color.color || ''), size: String(size.size || ''), qty: Number(size.qty || 0) }))
        ).filter((item: any) => item.color && item.size && item.qty > 0),
        id: `po-${newJobNo}-${styleIndex + 1}-${refIndex + 1}`
      }));
      return {
        id: `s-${newJobNo}-${styleIndex + 1}`,
        styleNo: String(style.styleNo || ''),
        itemDescription: String(style.styleDescription || style.description || ''),
        quantity: Number(style.totalQty || overallBreakdowns.reduce((sum: number, item: any) => sum + item.qty, 0)),
        breakdowns: overallBreakdowns,
        purchaseOrders: pos.map((p: any) => ({
          id: p.id, poNumber: p.poNumber, ccd: p.ccd, shipmentDate: p.shipmentDate,
          totalQty: p.totalQty, breakdowns: p.breakdowns, referenceType: p.referenceType,
          destination: p.destination, market: p.market
        })),
        sourceMetadata: {
          merchandisingFollowUp: { presentStatus: 'Order Confirmed', merchandiser: '' },
          import: { parserFamily: preview.parserFamily, parserVersion: preview.parserVersion, warnings: preview.warnings || [] }
        }
      };
    });

    const primaryStyle = styles[0] || {};
    const totalOrderQty = styles.reduce((sum: number, style: any) => sum + Number(style.quantity || 0), 0);
    const exFactoryDate = primaryStyle.purchaseOrders?.[0]?.shipmentDate || '2026-11-20';
    const poReceivedDate = new Date().toISOString().split('T')[0];

    const newOrder = {
      id: `ord-${newJobNo}`,
      jobNo: newJobNo,
      totalQty: totalOrderQty,
      buyer: { id: buyerId, name: buyerName, code: buyerName },
      factory: { id: 'f-nfl', name: 'Northern Fashions Limited (NFL)', code: 'NFL' },
      styles,
      importMetadata: { parserFamily: preview.parserFamily, parserVersion: preview.parserVersion, warnings: preview.warnings || [], validation: preview.validation }
    };
    memoryCreatedOrders.unshift(newOrder);

    // Initial workflow state tracking all departments
    const workflowState = {
      jobNo: newJobNo,
      buyer: buyerName,
      styleNo: primaryStyle.styleNo || 'Imported Style',
      totalQty: totalOrderQty,
      overallStage: 'T&A / Pre-production',
      presentStatus: 'PO Imported · Central IE & CAD Pending',
      // 1. Central IE
      ieBulletin: {
        status: 'PENDING', // PENDING -> READY_IMPORTED -> PULLED_BY_PLANNING
        bulletinNo: `IE-B-${newJobNo}`,
        smv: 8.5,
        targetPerHour: 180,
        operationsCount: 18,
        fileAttached: true,
        fileName: `IE-Bulletin-${primaryStyle.styleNo || newJobNo}.xlsx`,
        updatedAt: null,
        note: 'Central IE bulletin generated. Data will auto-pull when Planning opens this Job.'
      },
      // 2. CAD Consumption
      cad: {
        status: 'PENDING', // PENDING -> COMPLETED
        consumptionKgPerDz: 2.65,
        consumptionYards: 1.82,
        markerEfficiencyPct: 86.4,
        markerWidth: '60"',
        completedAt: null,
        note: 'Awaiting marker efficiency and fabric consumption calculation.'
      },
      // 3. Merchandising Fabric Order Sheet
      fabricOrderSheet: {
        status: 'PENDING_CAD', // PENDING_CAD -> PREPARING -> PREPARED_OK -> PLANNING_APPROVED
        preparedBy: 'Md. Jahidul Islam',
        preparedAt: null,
        approvalStatus: 'PENDING',
        approvedBy: '',
        approvedAt: null,
        dispatchedToKnitting: false,
        dispatchedToDyeing: false,
        knitDyeCopySentAt: null,
        fabricComposition: '100% Combed Cotton Single Jersey',
        gsm: 180,
        requiredFabricKg: Math.round(totalOrderQty * 0.22)
      },
      // 4. Trims & Accessories BOM & Ordering
      trims: {
        bomStatus: 'PREPARED_OK',
        orderingStatus: 'PENDING', // PENDING -> ORDER_OK
        items: [
          { name: '100% Spun Polyester Sewing Thread (Tex 24)', required: `${Math.round(totalOrderQty * 120)} m`, status: 'PENDING', remarks: 'Awaiting lab shade approval for exact thread matching' },
          { name: 'Woven Main Neck Label', required: `${totalOrderQty} pcs`, status: 'ORDER_OK', supplier: 'Avery Dennison', remarks: 'Order Placed (OK)' },
          { name: 'Printed Care / Content Satin Label', required: `${totalOrderQty} pcs`, status: 'PENDING', remarks: 'Awaiting buyer barcode layout approval' },
          { name: 'Printed Barcode Hangtag + String', required: `${totalOrderQty} pcs`, status: 'ORDER_OK', supplier: 'Paxar', remarks: 'Order Placed (OK)' },
          { name: 'Self-adhesive Polybag with Warning', required: `${totalOrderQty} pcs`, status: 'ORDER_OK', remarks: 'In-house store stock available' },
          { name: '7-ply Export Corrugated Master Carton', required: `${Math.ceil(totalOrderQty / 24)} ctns`, status: 'PENDING', remarks: 'Final carton dimension awaiting packing ratio' }
        ]
      },
      // 5. Dyeing Lab Shade Approval
      labShade: {
        status: 'PENDING', // PENDING -> SHADE_OK
        shades: (primaryStyle.breakdowns || []).map((b: any) => ({
          color: b.color,
          labDipRef: `LD-${b.color.substring(0, 3).toUpperCase()}-01`,
          shadeStatus: 'PENDING_LAB',
          shadeNote: 'Lab shade swatch matching against buyer master swatch standard'
        })),
        approvedAt: null,
        approvedBy: ''
      },
      // 6. T&A (Time & Action) Plan
      tna: {
        status: 'PENDING', // PENDING -> PREPARED_OK -> PLANNING_APPROVED
        preparedBy: '',
        preparedAt: null,
        printedAt: null,
        approvedBy: '',
        approvedAt: null,
        milestones: [
          { name: 'PO Received / Data Import', plannedDate: poReceivedDate, actualDate: poReceivedDate, status: 'DONE' },
          { name: 'CAD Consumption Finalized', plannedDate: '2026-10-16', actualDate: '', status: 'PENDING' },
          { name: 'Dyeing Lab Shade Approval', plannedDate: '2026-10-18', actualDate: '', status: 'PENDING' },
          { name: 'Trims & Accessories In-House', plannedDate: '2026-10-25', actualDate: '', status: 'PENDING' },
          { name: 'Fabric Order Sheet Prepared', plannedDate: '2026-10-19', actualDate: '', status: 'PENDING' },
          { name: 'Central Planning Approval', plannedDate: '2026-10-20', actualDate: '', status: 'PENDING' },
          { name: 'Knitting Greige Complete', plannedDate: '2026-10-28', actualDate: '', status: 'PENDING' },
          { name: 'Batch Dyeing & Finishing Complete', plannedDate: '2026-11-04', actualDate: '', status: 'PENDING' },
          { name: 'PP Meeting & Cut Approval', plannedDate: '2026-11-06', actualDate: '', status: 'PENDING' },
          { name: 'Sewing Line Input', plannedDate: '2026-11-08', actualDate: '', status: 'PENDING' },
          { name: 'Final Inspection & Pack', plannedDate: '2026-11-18', actualDate: '', status: 'PENDING' },
          { name: 'Ex-Factory Cargo Handover', plannedDate: exFactoryDate, actualDate: '', status: 'PENDING' }
        ]
      },
      // 7. Central Planning Sewing Line Plan
      sewingPlanning: {
        status: 'PENDING',
        allocatedLine: '',
        allocatedFloor: '',
        planStartDate: '',
        planEndDate: '',
        targetPerHour: null
      }
    };
    memoryJobWorkflowStates[newJobNo] = workflowState;

    // Full Master Job Object for /jobs and /jobs/[id]
    const masterJobItem = {
      id: `JOB-${newJobNo}-1`,
      recordId: `IMP-${newJobNo}`,
      jobNo: newJobNo,
      buyer: buyerName,
      buyerRaw: buyerName,
      buyerCode: buyerName,
      styleNo: primaryStyle.styleNo || 'Imported Style',
      orderQty: totalOrderQty,
      item: primaryStyle.itemDescription || 'Garments',
      itemDescription: primaryStyle.itemDescription || 'Imported Garment Style',
      merchandiser: 'Md. Jahidul Islam',
      presentStatus: 'PO Imported · Pre-Production Stage',
      overallStage: 'T&A / Pre-production',
      riskStatus: 'ON_TRACK',
      planMonth: 'Oct-2026',
      isNewlyImported: true,
      createdAt: new Date().toISOString(),
      dates: {
        poReceived: poReceivedDate,
        cadTarget: '16-Oct-2026',
        fabricOrderTarget: '19-Oct-2026',
        tnaPlan: '18-Oct-2026',
        exFactory: exFactoryDate,
        cargoClosing: exFactoryDate
      },
      fabric: {
        fabricType: 'Single Jersey',
        gsm: '180',
        widthDia: '60"',
        colors: (primaryStyle.breakdowns || []).map((b: any) => b.color).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i).join(', ') || 'Solid Dye',
        colorCount: (primaryStyle.breakdowns || []).length || 1,
        fabricReqKg: Math.round(totalOrderQty * 0.22),
        fabricReceivedKg: 0,
        fabricBalanceKg: Math.round(totalOrderQty * 0.22),
        additionalProcess: 'Compacting + Bio Polish',
        dyeingFactory: 'NFL',
        dyeBatchNo: 'Awaiting Planning Approval'
      },
      yarn: {
        yarnReqKg: Math.round(totalOrderQty * 0.24),
        yarnReceivedKg: 0,
        yarnIssuedKg: 0,
        yarnBalanceKg: Math.round(totalOrderQty * 0.24),
        yarnLotNo: 'Pending Yarn Allocation',
        status: 'PENDING'
      },
      knitting: {
        greyReqKg: Math.round(totalOrderQty * 0.23),
        greyProducedKg: 0,
        greyBalanceKg: Math.round(totalOrderQty * 0.23),
        status: 'PENDING_PLANNING_APPROVAL'
      },
      cutting: {
        cuttingQty: 0,
        cuttingBalance: totalOrderQty,
        status: 'PENDING'
      },
      printEmb: {
        type: 'None / Plain',
        reqQty: totalOrderQty,
        sendQty: 0,
        recvQty: 0,
        status: 'NA'
      },
      sewing: {
        readyForInput: 0,
        inputQty: 0,
        inputBalance: totalOrderQty,
        inputStatus: 'PENDING',
        sewingActualQty: 0,
        sewingBalance: totalOrderQty,
        achievementPct: 0,
        status: 'PENDING_LINE_PLAN'
      },
      ie: {
        smv: 8.5,
        machineQty: 22,
        manpower: 32,
        efficiencyPct: 75.0,
        dailyTarget: 1800,
        targetPerHour: 180,
        bulletinStatus: 'PENDING_CREATION',
        bulletinReleaseDate: 'Pending'
      },
      lineAllocation: {
        factory: 'NFL',
        floor: 'Floor 1',
        line: 'Pending Planning Allocation',
        secondaryLine: '',
        lineType: 'GENERAL',
        shiftMode: 'GENERAL',
        hours: 10,
        planStart: 'Pending',
        planEnd: 'Pending',
        status: 'PRE_PRODUCTION'
      },
      finishing: {
        finishingQty: 0,
        packingQty: 0,
        inspectionStatus: 'PENDING'
      },
      shipment: {
        shipQty: 0,
        shipBalance: totalOrderQty,
        status: 'CONFIRMED'
      },
      workflow: workflowState,
      importedOrder: newOrder
    };
    memoryCreatedJobs.unshift(masterJobItem);

    // Generate 8 Department Tasks across IE, CAD, Merchandising, Dyeing Lab, and Central Planning
    const generatedTasks = [
      {
        id: `task-ie-${newJobNo}`,
        jobNo: newJobNo,
        title: `Create & Import IE Bulletin for Style ${primaryStyle.styleNo || 'Style'}`,
        module: 'ie-bulletin',
        department: 'Central IE',
        priority: 'HIGH',
        status: 'PENDING',
        dueAt: '2026-10-16',
        description: `Central IE must prepare and import operation bulletin, SMV, machine layout & pitch time for Job #${newJobNo}. Central Planning auto-pulls this bulletin upon job entry.`,
        order: { jobNo: newJobNo, buyer: { name: buyerName, code: buyerName }, styleNo: primaryStyle.styleNo, qty: totalOrderQty }
      },
      {
        id: `task-cad-${newJobNo}`,
        jobNo: newJobNo,
        title: `Calculate CAD Consumption & Marker Efficiency`,
        module: 'cad',
        department: 'CAD Section',
        priority: 'HIGH',
        status: 'PENDING',
        dueAt: '2026-10-16',
        description: `CAD must calculate fabric consumption per dozen/pc and marker efficiency for Job #${newJobNo}. Completing this unlocks Fabric Order Sheet preparation for Merchandiser.`,
        order: { jobNo: newJobNo, buyer: { name: buyerName, code: buyerName }, styleNo: primaryStyle.styleNo, qty: totalOrderQty }
      },
      {
        id: `task-fos-${newJobNo}`,
        jobNo: newJobNo,
        title: `Prepare Fabric Order Sheet`,
        module: 'merchandising',
        department: 'Merchandising',
        priority: 'CRITICAL',
        status: 'PENDING',
        dueAt: '2026-10-18',
        description: `Merchandiser creates Fabric Order Sheet combining CAD consumption + PO pack sheet. Submit as Prepared OK for Central Planning approval.`,
        order: { jobNo: newJobNo, buyer: { name: buyerName, code: buyerName }, styleNo: primaryStyle.styleNo, qty: totalOrderQty }
      },
      {
        id: `task-tbom-${newJobNo}`,
        jobNo: newJobNo,
        title: `Prepare Trims & Accessories BOM`,
        module: 'bom-material',
        department: 'Merchandising',
        priority: 'NORMAL',
        status: 'PENDING',
        dueAt: '2026-10-17',
        description: `Merchandiser builds Bill of Materials (BOM) for thread, labels, poly, cartons, hangtags for Job #${newJobNo}.`,
        order: { jobNo: newJobNo, buyer: { name: buyerName, code: buyerName }, styleNo: primaryStyle.styleNo, qty: totalOrderQty }
      },
      {
        id: `task-tord-${newJobNo}`,
        jobNo: newJobNo,
        title: `Trims & Materials Ordering Status Follow-up`,
        module: 'merchandising',
        department: 'Merchandising',
        priority: 'NORMAL',
        status: 'PENDING',
        dueAt: '2026-10-20',
        description: `Track item-by-item ordering status. Mark Order OK for placed items; items Not OK remain highlighted in Remarks.`,
        order: { jobNo: newJobNo, buyer: { name: buyerName, code: buyerName }, styleNo: primaryStyle.styleNo, qty: totalOrderQty }
      },
      {
        id: `task-shade-${newJobNo}`,
        jobNo: newJobNo,
        title: `Dyeing Lab Shade Approval & Lab Dip Matching`,
        module: 'lab',
        department: 'Dyeing Lab',
        priority: 'HIGH',
        status: 'PENDING',
        dueAt: '2026-10-18',
        description: `Dyeing Lab tests and certifies color shades against buyer standard. Approving shade marks 'Shade OK' on Job #${newJobNo}.`,
        order: { jobNo: newJobNo, buyer: { name: buyerName, code: buyerName }, styleNo: primaryStyle.styleNo, qty: totalOrderQty }
      },
      {
        id: `task-tna-${newJobNo}`,
        jobNo: newJobNo,
        title: `Prepare & Review T&A (Time & Action Plan)`,
        module: 'ta',
        department: 'Merchandising',
        priority: 'CRITICAL',
        status: 'PENDING',
        dueAt: '2026-10-18',
        description: `Prepare critical T&A milestones, print and review. Submit along with Fabric Order Sheet to Central Planning.`,
        order: { jobNo: newJobNo, buyer: { name: buyerName, code: buyerName }, styleNo: primaryStyle.styleNo, qty: totalOrderQty }
      },
      {
        id: `task-plan-appr-${newJobNo}`,
        jobNo: newJobNo,
        title: `Central Planning: Approve T&A Plan & Fabric Order Sheet`,
        module: 'sewing-planning',
        department: 'Central Planning',
        priority: 'CRITICAL',
        status: 'PENDING',
        dueAt: '2026-10-20',
        description: `Central Planning reviews and approves Fabric Order Sheet and T&A Plan. Once approved, system automatically dispatches copy to Knitting & Dyeing departments.`,
        order: { jobNo: newJobNo, buyer: { name: buyerName, code: buyerName }, styleNo: primaryStyle.styleNo, qty: totalOrderQty }
      }
    ];
    memoryTasks = [...generatedTasks, ...memoryTasks];

    return NextResponse.json({
      success: true,
      jobNo: newJobNo,
      order: { id: newOrder.id, jobNo: newJobNo, buyerId, styles: newOrder.styles },
      job: masterJobItem,
      workflow: workflowState,
      tasksGenerated: generatedTasks.length,
      warnings: preview.warnings || [],
      message: `Imported ${styles.length} extracted style(s) into Job ${newJobNo}. Generated 8 workflow tasks across Central IE, CAD, Merchandising, Dyeing Lab, and Central Planning.`
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

  if (pathStr === 'tasks/update') {
    const body = await request.json().catch(() => ({}));
    const taskId = String(body.taskId || body.id || '');
    const taskStatus = String(body.status || 'COMPLETED');
    const task = memoryTasks.find(t => t.id === taskId);
    if (task) {
      task.status = taskStatus;
      task.updatedAt = new Date().toISOString();
      if (body.remarks) task.remarks = body.remarks;

      // Automatically update corresponding workflow state if linked to a job
      const jNo = task.jobNo || task.order?.jobNo;
      if (jNo && memoryJobWorkflowStates[jNo]) {
        const wf = memoryJobWorkflowStates[jNo];
        if (task.module === 'cad') {
          wf.cad.status = 'COMPLETED';
          wf.cad.completedAt = new Date().toISOString();
          if (body.consumptionKgPerDz) wf.cad.consumptionKgPerDz = body.consumptionKgPerDz;
          if (body.markerEfficiencyPct) wf.cad.markerEfficiencyPct = body.markerEfficiencyPct;
          wf.fabricOrderSheet.status = 'PREPARING';
          wf.presentStatus = 'CAD Completed · Fabric Order Sheet In Preparation';
        } else if (task.module === 'ie-bulletin') {
          wf.ieBulletin.status = 'READY_IMPORTED';
          wf.ieBulletin.updatedAt = new Date().toISOString();
          if (body.smv) wf.ieBulletin.smv = body.smv;
        } else if (task.module === 'lab') {
          wf.labShade.status = 'SHADE_OK';
          wf.labShade.approvedAt = new Date().toISOString();
          wf.labShade.approvedBy = body.approvedBy || 'Dyeing Lab In-charge';
          wf.labShade.shades.forEach((s: any) => { s.shadeStatus = 'SHADE_OK'; });
        } else if (task.module === 'merchandising' && task.title.includes('Fabric Order Sheet')) {
          wf.fabricOrderSheet.status = 'PREPARED_OK';
          wf.fabricOrderSheet.preparedAt = new Date().toISOString();
          wf.fabricOrderSheet.preparedBy = 'Md. Jahidul Islam';
        } else if (task.module === 'ta') {
          wf.tna.status = 'PREPARED_OK';
          wf.tna.preparedAt = new Date().toISOString();
          wf.tna.printedAt = new Date().toISOString();
        } else if (task.module === 'sewing-planning') {
          wf.fabricOrderSheet.status = 'PLANNING_APPROVED';
          wf.fabricOrderSheet.approvalStatus = 'APPROVED';
          wf.fabricOrderSheet.approvedAt = new Date().toISOString();
          wf.fabricOrderSheet.approvedBy = 'Central Planning';
          wf.fabricOrderSheet.dispatchedToKnitting = true;
          wf.fabricOrderSheet.dispatchedToDyeing = true;
          wf.fabricOrderSheet.knitDyeCopySentAt = new Date().toISOString();
          wf.tna.status = 'PLANNING_APPROVED';
          wf.overallStage = 'Knitting / Dyeing Prep';
          wf.presentStatus = 'Planning Approved · Auto-dispatched to Knitting & Dyeing';
        }
      }
      return NextResponse.json({ success: true, task });
    }
    return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
  }

  if (pathStr.startsWith('jobs/') && pathStr.endsWith('/workflow')) {
    const jobNo = pathStr.split('/')[1];
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    let wf = memoryJobWorkflowStates[jobNo];
    if (!wf) {
      const existingJob = memoryCreatedJobs.find(j => String(j.jobNo) === jobNo) || masterJobs.find((j: any) => String(j.jobNo) === jobNo);
      wf = {
        jobNo,
        buyer: existingJob?.buyer || 'Buyer',
        styleNo: existingJob?.styleNo || 'Style',
        totalQty: existingJob?.orderQty || 3000,
        overallStage: existingJob?.overallStage || 'T&A / Pre-production',
        presentStatus: existingJob?.presentStatus || 'In Progress',
        ieBulletin: { status: 'PENDING', bulletinNo: `IE-B-${jobNo}`, smv: 8.5, targetPerHour: 180, operationsCount: 18, fileAttached: true, fileName: `IE-Bulletin-${jobNo}.xlsx`, updatedAt: null },
        cad: { status: 'PENDING', consumptionKgPerDz: 2.65, consumptionYards: 1.82, markerEfficiencyPct: 86.4, markerWidth: '60"', completedAt: null },
        fabricOrderSheet: { status: 'PENDING_CAD', preparedBy: '', preparedAt: null, approvalStatus: 'PENDING', approvedBy: '', approvedAt: null, dispatchedToKnitting: false, dispatchedToDyeing: false, knitDyeCopySentAt: null, fabricComposition: '100% Cotton Single Jersey', gsm: 180, requiredFabricKg: 1200 },
        trims: { bomStatus: 'PREPARED_OK', orderingStatus: 'PENDING', items: [] },
        labShade: { status: 'PENDING', shades: [{ color: 'Main Color', labDipRef: 'LD-01', shadeStatus: 'PENDING_LAB', shadeNote: 'Awaiting Lab Approval' }], approvedAt: null, approvedBy: '' },
        tna: { status: 'PENDING', preparedBy: '', preparedAt: null, printedAt: null, approvedBy: '', approvedAt: null, milestones: [] },
        sewingPlanning: { status: 'PENDING', allocatedLine: '', allocatedFloor: '', planStartDate: '', planEndDate: '', targetPerHour: null }
      };
      memoryJobWorkflowStates[jobNo] = wf;
    }

    if (action === 'ie_bulletin_ready') {
      wf.ieBulletin.status = 'READY_IMPORTED';
      wf.ieBulletin.updatedAt = new Date().toISOString();
      if (body.smv) wf.ieBulletin.smv = Number(body.smv);
      const t = memoryTasks.find(x => String(x.jobNo) === jobNo && x.module === 'ie-bulletin');
      if (t) t.status = 'COMPLETED';
    } else if (action === 'cad_consumption_submit') {
      wf.cad.status = 'COMPLETED';
      wf.cad.completedAt = new Date().toISOString();
      if (body.consumptionKgPerDz) wf.cad.consumptionKgPerDz = Number(body.consumptionKgPerDz);
      if (body.markerEfficiencyPct) wf.cad.markerEfficiencyPct = Number(body.markerEfficiencyPct);
      wf.fabricOrderSheet.status = 'PREPARING';
      wf.presentStatus = 'CAD Completed · Fabric Order Sheet In Preparation';
      const t = memoryTasks.find(x => String(x.jobNo) === jobNo && x.module === 'cad');
      if (t) t.status = 'COMPLETED';
    } else if (action === 'fabric_order_sheet_prepared') {
      wf.fabricOrderSheet.status = 'PREPARED_OK';
      wf.fabricOrderSheet.preparedAt = new Date().toISOString();
      wf.fabricOrderSheet.preparedBy = body.preparedBy || 'Md. Jahidul Islam';
      const t = memoryTasks.find(x => String(x.jobNo) === jobNo && x.module === 'merchandising' && x.title.includes('Fabric Order Sheet'));
      if (t) t.status = 'COMPLETED';
    } else if (action === 'trims_item_status') {
      const itemIndex = Number(body.itemIndex ?? -1);
      if (itemIndex >= 0 && wf.trims?.items?.[itemIndex]) {
        wf.trims.items[itemIndex].status = body.status || 'ORDER_OK';
        if (body.remarks) wf.trims.items[itemIndex].remarks = body.remarks;
      }
    } else if (action === 'shade_approval_submit') {
      wf.labShade.status = 'SHADE_OK';
      wf.labShade.approvedAt = new Date().toISOString();
      wf.labShade.approvedBy = body.approvedBy || 'Dyeing Lab Chief';
      (wf.labShade.shades || []).forEach((s: any) => { s.shadeStatus = 'SHADE_OK'; });
      const t = memoryTasks.find(x => String(x.jobNo) === jobNo && x.module === 'lab');
      if (t) t.status = 'COMPLETED';
    } else if (action === 'tna_prepared') {
      wf.tna.status = 'PREPARED_OK';
      wf.tna.preparedAt = new Date().toISOString();
      wf.tna.printedAt = new Date().toISOString();
      wf.tna.preparedBy = body.preparedBy || 'Md. Jahidul Islam';
      const t = memoryTasks.find(x => String(x.jobNo) === jobNo && x.module === 'ta');
      if (t) t.status = 'COMPLETED';
    } else if (action === 'fabric_order_sheet_physical_signed') {
      wf.fabricOrderSheet.physicalCopySigned = true;
      wf.fabricOrderSheet.physicalSignedAt = new Date().toISOString();
      wf.fabricOrderSheet.physicalSignedBy = body.signedBy || 'Central Planning Head';
      wf.fabricOrderSheet.physicalCopyReference = body.physicalCopyReference || wf.fabricOrderSheet.physicalCopyReference || '';
      wf.fabricOrderSheet.status = 'PHYSICAL_COPY_SIGNED';
    } else if (action === 'planning_approval_submit') {
      if (!wf.fabricOrderSheet.physicalCopySigned && !wf.fabricOrderSheet.dispatchedToKnitting) {
        return NextResponse.json({ success: false, error: 'Record the physical signed copy before final ERP approval.' }, { status: 409 });
      }
      const approvedAt = new Date().toISOString();
      const sourceRows = Array.isArray(wf.fabricOrderSheet.fabricRows) ? wf.fabricOrderSheet.fabricRows : [];
      const fabricBreakdown = sourceRows.map((row: any, index: number) => ({
        id: row.id || `fabric-${index + 1}`,
        part: row.part || row.fabricPart || 'Fabric',
        colour: row.colorCode || row.colour || row.color || 'UNSPECIFIED',
        composition: row.composition || wf.fabricOrderSheet.fabricComposition || 'UNSPECIFIED',
        construction: row.gsmFabricDescription || row.construction || wf.fabricOrderSheet.fabricConstruction || 'UNSPECIFIED',
        quantityKg: Number(row.totalKg || row.requiredKg || 0)
      }));
      wf.fabricOrderSheet.status = 'PLANNING_APPROVED';
      wf.fabricOrderSheet.approvalStatus = 'APPROVED';
      wf.fabricOrderSheet.approvedAt = approvedAt;
      wf.fabricOrderSheet.approvedBy = body.approvedBy || 'Central Planning Head';
      wf.fabricOrderSheet.dispatchedToKnitting = true;
      wf.fabricOrderSheet.dispatchedToDyeing = true;
      wf.fabricOrderSheet.dispatchedToGreyFabricStore = true;
      wf.fabricOrderSheet.dispatchedToFinishedFabricStore = true;
      wf.fabricOrderSheet.knitDyeCopySentAt = approvedAt;
      wf.fabricOrderSheet.distribution = {
        approvedAt,
        approvedBy: wf.fabricOrderSheet.approvedBy,
        basis: ['colour', 'composition', 'construction'],
        fabricRows: fabricBreakdown,
        knitting: { status: 'REQUIREMENT_RELEASED', rows: fabricBreakdown },
        dyeing: { status: 'REQUIREMENT_RELEASED', rows: fabricBreakdown },
        greyFabricStore: { status: 'EXPECTED_GREY_FABRIC', rows: fabricBreakdown },
        finishedFabricStore: { status: 'EXPECTED_FINISHED_FABRIC', rows: fabricBreakdown }
      };
      wf.tna.status = 'PLANNING_APPROVED';
      wf.tna.approvedAt = approvedAt;
      wf.tna.approvedBy = body.approvedBy || 'Central Planning Head';
      wf.overallStage = 'Knitting & Dyeing Execution';
      wf.presentStatus = 'Planning Approved · Signed T&A / Fabric Order Sheet distributed by colour, composition and construction';
      const t = memoryTasks.find(x => String(x.jobNo) === jobNo && (x.module === 'sewing-planning' || x.title.includes('Planning')));
      if (t) t.status = 'COMPLETED';

      // Update matching master job
      const mj = memoryCreatedJobs.find(j => String(j.jobNo) === jobNo);
      if (mj) {
        mj.overallStage = 'Knitting & Dyeing Execution';
        mj.presentStatus = 'Planning Approved · Fabric requirement released to Knitting, Dyeing and Fabric Stores';
        if (mj.knitting) mj.knitting.status = 'RUNNING';
      }
    }

    return NextResponse.json({ success: true, workflow: wf, message: `Job ${jobNo} workflow stage updated.` });
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

  // PATCH /api/documents/styles/:styleId/forms/:formId
  if (pathStr.startsWith('documents/styles/') && path.length === 5 && path[3] === 'forms') {
    const styleId = path[2];
    const formId = path[4];
    const forms = getOrInitFormsForStyle(styleId);
    let target = forms.find((f: any) => f.id === formId);
    if (!target && forms.length > 0) {
      target = forms[0];
    }
    if (target) {
      if (body.status) target.status = body.status;
      if (body.data) target.data = { ...target.data, ...body.data };
      target.revision = (target.revision || 1) + 1;
      target.updatedAt = new Date().toISOString();
      return NextResponse.json(target);
    }
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

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
