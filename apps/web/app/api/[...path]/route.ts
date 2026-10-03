import { NextRequest, NextResponse } from 'next/server';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import factoryDataRaw from '../../../data/dyeing-factory-data.json';
import factoryKpiMasterRaw from '../../../data/factory-kpi-master.json';

const masterJobs = (demo2000DataRaw as any)?.jobs || [];
const factoryData = factoryDataRaw as any;
const factoryKpi = factoryKpiMasterRaw as any;

// In-memory Kaizen and manual KPI store
let memoryKaizenProjects = [
  { id: 'kz-1', kaizenNo: 'KZ-2026-001', title: 'Folder Attachment on Feed-off-the-Arm Seam', category: 'Productivity', employeeName: 'Md. Al-Amin', department: 'IE', section: 'Sewing', floorCode: 'NFL-FL1', lineCode: 'Line 04A', monthlySaving: 48000, annualSaving: 576000, status: 'IMPLEMENTED', costBenefit: 'Folder cost 3,500 Tk', technicalBenefit: 'Eliminates puckering', safetyBenefit: 'Reduces operator hand fatigue' },
  { id: 'kz-2', kaizenNo: 'KZ-2026-002', title: 'Pneumatic Thread Trimmer on Overlock Table', category: 'Method', employeeName: 'Sufia Begum', department: 'Sewing', section: 'Sewing', floorCode: 'NFL-FL2', lineCode: 'Line 11B', monthlySaving: 32000, annualSaving: 384000, status: 'SUSTAINED', costBenefit: 'In-house fabrication 1,200 Tk', technicalBenefit: 'Reduces 2.1 sec/pc cycle time', safetyBenefit: 'Hands stay 10cm from knife' },
  { id: 'kz-3', kaizenNo: 'KZ-2026-003', title: 'Laser Guideline for Front Placket Notch Alignment', category: 'Quality', employeeName: 'Kamrul Hassan', department: 'Quality', section: 'Sewing', floorCode: 'NCL-FL1', lineCode: 'Line 18A', monthlySaving: 65000, annualSaving: 780000, status: 'APPROVED', costBenefit: 'Laser diode 800 Tk', technicalBenefit: 'Reduces placket DHU from 4.2 to 0.8', safetyBenefit: 'Class 1 eye-safe' },
  { id: 'kz-4', kaizenNo: 'KZ-2026-004', title: 'Gravity Chute Bundle Transfer from Cutting to Sewing Prep', category: 'Space', employeeName: 'Tariqul Islam', department: 'Cutting', section: 'Cutting', floorCode: 'NFL-FL1', lineCode: 'Prep-1', monthlySaving: 41000, annualSaving: 492000, status: 'REVIEW', costBenefit: 'Sheet metal 4,000 Tk', technicalBenefit: 'Saves 35 min transport per batch', safetyBenefit: 'Eliminates heavy lifting' },
  { id: 'kz-5', kaizenNo: 'KZ-2026-005', title: 'Circular Knitting Lycra Feeder Stop Motion Sensor', category: 'Cost Saving', employeeName: 'Abdul Mannan', department: 'Knitting', section: 'Knitting', floorCode: 'NFL-KNIT', lineCode: 'Knit-M12', monthlySaving: 88000, annualSaving: 1056000, status: 'IMPLEMENTED', costBenefit: 'Sensor 2,500 Tk', technicalBenefit: 'Eliminates Lycra run-out fabric defect', safetyBenefit: 'Automatic stop' }
];

let memoryManualKpis: any[] = [];

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');

  // 1. /api/orders
  if (pathStr === 'orders') {
    const formatted = masterJobs.map((j: any) => ({
      id: j.id,
      jobNo: j.jobNo,
      totalQty: j.orderQty,
      buyer: { id: `b-${j.buyer}`, name: j.buyer, code: j.buyer },
      factory: { id: `f-${j.lineAllocation?.factory || 'NFL'}`, name: j.lineAllocation?.factory === 'NCL' ? 'Northern Clothing Limited' : 'Northern Fashions Limited', code: j.lineAllocation?.factory || 'NFL' },
      styles: [
        {
          id: `s-${j.jobNo}`,
          styleNo: j.styleNo,
          itemDescription: j.itemDescription,
          quantity: j.orderQty,
          purchaseOrders: [
            { id: `po-${j.jobNo}`, poNumber: `PO-${j.jobNo}`, ccd: j.dates?.cargoClosing, shipmentDate: j.dates?.exFactory }
          ],
          sourceMetadata: {
            merchandisingFollowUp: { presentStatus: j.presentStatus, merchandiser: j.merchandiser },
            planning: { taStatus: 'APPROVED', taPlanDate: j.dates?.tnaPlan },
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
    }));
    return NextResponse.json(formatted);
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
      rows: [
        { section: 'knitting', label: 'Knitting (Circular + Flat)', slots: [{ slot: 'Slot 1', loadPct: 92 }, { slot: 'Slot 2', loadPct: 88 }, { slot: 'Slot 3', loadPct: 94 }] },
        { section: 'dyeing', label: 'Dyeing & Finishing Winches', slots: [{ slot: 'Slot 1', loadPct: 96 }, { slot: 'Slot 2', loadPct: 91 }, { slot: 'Slot 3', loadPct: 89 }] },
        { section: 'cutting', label: 'Automated Cutting & Spreading', slots: [{ slot: 'Slot 1', loadPct: 85 }, { slot: 'Slot 2', loadPct: 90 }, { slot: 'Slot 3', loadPct: 84 }] },
        { section: 'sewing', label: 'Sewing Lines (91 physical lines)', slots: [{ slot: 'Slot 1', loadPct: 94 }, { slot: 'Slot 2', loadPct: 98 }, { slot: 'Slot 3', loadPct: 95 }] },
        { section: 'finishing', label: 'Finishing & Steam Tunnel', slots: [{ slot: 'Slot 1', loadPct: 89 }, { slot: 'Slot 2', loadPct: 86 }, { slot: 'Slot 3', loadPct: 92 }] }
      ]
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
        id: 'batch-finish-fabric',
        createdAt: '2026-10-01T05:41:00.000Z',
        moduleSlug: 'report:FINISH_FABRIC_DYEING',
        sourceFileName: 'Finish_Fabric_Plan_Execution_Status.xls',
        totalRows: 1387,
        validRows: 1387,
        errorRows: 0,
        status: 'COMMITTED',
        isSystem: true
      },
      {
        id: 'batch-quality-rft',
        createdAt: '2026-10-01T05:41:00.000Z',
        moduleSlug: 'report:BULK_TO_BULK_RFT_QUALITY',
        sourceFileName: 'Bulk_to_Bulk_RFT.xlsx',
        totalRows: 225,
        validRows: 225,
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

  // 10. /api/masters/references and /api/masters/references/:category
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
        { id: 'm-1', value: 'Md. Jahidul Islam' },
        { id: 'm-2', value: 'Tanvir Ahmed' },
        { id: 'm-3', value: 'Kazi Masud' },
        { id: 'm-4', value: 'Shah Alam' },
        { id: 'm-5', value: 'Rashedul Hasan' },
        { id: 'm-6', value: 'Naimur Rahman' }
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
      { id: 'b-1', name: 'Name It', code: 'NMT' },
      { id: 'b-2', name: 'ONLY', code: 'ONL' },
      { id: 'b-3', name: 'OVS', code: 'OVS' },
      { id: 'b-4', name: 'UTG', code: 'UTG' },
      { id: 'b-5', name: 'Only & Sons', code: 'ONS' },
      { id: 'b-6', name: 'New Look', code: 'NWL' }
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

  // /api/planning/gantt
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
      jobNo: j.jobNo,
      buyer: j.buyer,
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

  // 15. /api/knitting/data
  if (pathStr === 'knitting/data') {
    return NextResponse.json({
      orders: factoryData?.executionRows?.slice(0, 50) || [],
      summary: {
        totalReqKg: 248900,
        producedKg: 194200,
        balanceKg: 54700,
        runningMachines: 18
      }
    });
  }

  // 16. /api/greige-store/data
  if (pathStr === 'greige-store/data') {
    return NextResponse.json({
      stockKg: 124500,
      allocatedKg: 98000,
      availableKg: 26500,
      recentRolls: factoryData?.executionRows?.slice(0, 25) || []
    });
  }

  // 17. /api/ie-ops/kpi
  if (pathStr === 'ie-ops/kpi') {
    const yr = Number(request.nextUrl.searchParams.get('year') || 2026);
    const mo = Number(request.nextUrl.searchParams.get('month') || 8);
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const key = monthKeys[mo - 1] || 'aug';

    const autoKpis = [
      { section: 'Sewing', kpiKey: 'SEWING_EFFICIENCY', kpiName: 'Factory Sewing Efficiency', value: factoryKpi.departmentKpis?.sewing?.[3]?.[key] ?? 70.36, unit: '%', source: 'AUTO_SEWING' },
      { section: 'Sewing', kpiKey: 'SEWING_PRODUCTION', kpiName: 'Sewing Output (Monthly Pcs)', value: factoryKpi.departmentKpis?.sewing?.[2]?.[key] ?? 1477799, unit: 'Pcs', source: 'AUTO_SEWING' },
      { section: 'Sewing', kpiKey: 'SEWING_SMV', kpiName: 'Average Sewing SMV', value: factoryKpi.departmentKpis?.sewing?.[0]?.[key] ?? 9.60, unit: 'min', source: 'AUTO_IE' },
      { section: 'Sewing', kpiKey: 'SEWING_NPT_CAPTURING', kpiName: 'Sewing Capturing NPT', value: factoryKpi.departmentKpis?.sewing?.[6]?.[key] ?? 73.84, unit: '%', source: 'AUTO_SEWING' },
      { section: 'Sewing', kpiKey: 'CUT_TO_SHIP_LOSS', kpiName: 'Cut to Ship Loss %', value: factoryKpi.departmentKpis?.sewing?.[7]?.[key] ?? 2.59, unit: '%', source: 'AUTO_SEWING' },
      { section: 'Cutting', kpiKey: 'CUTTING_PRODUCTION', kpiName: 'Monthly Cutting Production', value: factoryKpi.departmentKpis?.cutting?.[0]?.[key] ?? 1427113, unit: 'Pcs', source: 'AUTO_CUTTING' },
      { section: 'Cutting', kpiKey: 'CUTTING_EFFICIENCY', kpiName: 'Cutting Efficiency', value: factoryKpi.departmentKpis?.cutting?.[1]?.[key] ?? 80.30, unit: '%', source: 'AUTO_CUTTING' },
      { section: 'Cutting', kpiKey: 'FABRIC_WASTAGE', kpiName: 'Fabric Wastage %', value: factoryKpi.departmentKpis?.cutting?.[2]?.[key] ?? 2.66, unit: '%', source: 'AUTO_CUTTING' },
      { section: 'Quality', kpiKey: 'IN_LINE_DHU', kpiName: 'In-Line DHU (Internal)', value: factoryKpi.departmentKpis?.quality?.[0]?.[key] ?? 9.46, unit: 'DHU', source: 'AUTO_QUALITY' },
      { section: 'Quality', kpiKey: 'FINAL_DHU', kpiName: 'Final Inspection DHU', value: factoryKpi.departmentKpis?.quality?.[4]?.[key] ?? 5.94, unit: 'DHU', source: 'AUTO_QUALITY' },
      { section: 'Quality', kpiKey: 'END_LINE_OQL', kpiName: 'End Line Audit OQL', value: factoryKpi.departmentKpis?.quality?.[1]?.[key] ?? 8.05, unit: '%', source: 'AUTO_QUALITY' },
      { section: 'Printing', kpiKey: 'PRINTING_PANELS', kpiName: 'Printing Production Panels', value: factoryKpi.departmentKpis?.printing?.[0]?.[key] ?? 826632, unit: 'Pcs', source: 'AUTO_PRINT' },
      { section: 'Printing', kpiKey: 'PRINTING_EFFICIENCY', kpiName: 'Printing Efficiency', value: factoryKpi.departmentKpis?.printing?.[1]?.[key] ?? 91.69, unit: '%', source: 'AUTO_PRINT' },
      { section: 'Printing', kpiKey: 'PRINTING_LOST_TIME', kpiName: 'Printing Lost Time', value: factoryKpi.departmentKpis?.printing?.[2]?.[key] ?? 8.31, unit: '%', source: 'AUTO_PRINT' },
      { section: 'Knitting', kpiKey: 'KNITTING_PRODUCTION', kpiName: 'Knitting Production', value: factoryKpi.departmentKpis?.knitting?.[0]?.[key] ?? 206159, unit: 'kg', source: 'AUTO_KNITTING' },
      { section: 'Knitting', kpiKey: 'KNITTING_OTD', kpiName: 'Knitting T&A On-Time Delivery', value: factoryKpi.departmentKpis?.knitting?.[1]?.[key] ?? 72.1, unit: '%', source: 'AUTO_KNITTING' },
      { section: 'Dyeing', kpiKey: 'DYEING_PRODUCTION', kpiName: 'Dyeing Production', value: factoryKpi.departmentKpis?.dyeing?.[0]?.[key] ?? 293310, unit: 'kg', source: 'AUTO_DYEING' },
      { section: 'Dyeing', kpiKey: 'DYEING_RFT', kpiName: 'Dyeing Right First Time (RFT)', value: factoryKpi.departmentKpis?.dyeing?.[1]?.[key] ?? 68.3, unit: '%', source: 'AUTO_DYEING' },
      { section: 'HR', kpiKey: 'ABSENTEEISM_RATE', kpiName: 'Worker Absenteeism Rate', value: factoryKpi.departmentKpis?.hr?.[0]?.[key] ?? 6.10, unit: '%', source: 'AUTO_HR' },
      { section: 'HR', kpiKey: 'WORKER_HAPPINESS', kpiName: 'Worker Happiness Index', value: factoryKpi.departmentKpis?.hr?.[2]?.[key] ?? 71.36, unit: '%', source: 'AUTO_HR' }
    ];

    const manualForMonth = memoryManualKpis.filter(m => Number(m.year) === yr && Number(m.month) === mo);
    return NextResponse.json({ auto: autoKpis, manual: manualForMonth });
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
      date: '2026-09-05',
      requestedDate: '2026-09-05',
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

  // 22. /api/planning/quota
  if (pathStr === 'planning/quota') {
    return NextResponse.json({
      reportDate: factoryKpi.reportDate,
      buyerQuota: factoryKpi.buyerQuota || [],
      sampleCapacity: factoryKpi.sampleCapacity || []
    });
  }

  // 23. /api/management/fob
  if (pathStr === 'management/fob') {
    return NextResponse.json({
      analytics: factoryKpi.fobAnalytics || []
    });
  }

  // 24. /api/kpi-tracker/full
  if (pathStr === 'kpi-tracker/full') {
    return NextResponse.json(factoryKpi);
  }

  // Default fallback for any other GET
  return NextResponse.json({ status: 'ok', path: pathStr, totalJobs: masterJobs.length });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');

  if (pathStr === 'auth/login') {
    const body = await request.json().catch(() => ({}));
    const email = body.email || 'admin@nfl.local';
    const user = {
      id: 'u-admin-1',
      email,
      name: email.split('@')[0] === 'admin' ? 'NFL Administrator' : 'Authorized User',
      roles: ['ADMIN']
    };
    return NextResponse.json({
      success: true,
      accessToken: 'demo-access-token-' + Date.now(),
      refreshToken: 'demo-refresh-token-' + Date.now(),
      user
    });
  }

  if (pathStr === 'demo/load') {
    return NextResponse.json({ createdOrders: 2000, message: 'All 2,000 jobs loaded and active' });
  }

  if (pathStr === 'planning/gantt/approve') {
    return NextResponse.json({ success: true, message: 'Selected line plans approved for floor execution' });
  }

  if (pathStr === 'planning/gantt/generate') {
    return NextResponse.json({ success: true, message: 'Line plan simulation re-generated from T&A dates' });
  }

  if (pathStr.endsWith('/undo')) {
    return NextResponse.json({ success: true, message: 'Previous baseline plan restored' });
  }

  return NextResponse.json({ success: true, message: `Action on ${pathStr} recorded successfully` });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  const body = await request.json().catch(() => ({}));

  if (pathStr.startsWith('planning/gantt/styles/')) {
    return NextResponse.json({ ...body, status: body.status || 'REVIEWED' });
  }

  if (pathStr.startsWith('masters/lines/')) {
    return NextResponse.json({ success: true, message: 'Line machines updated' });
  }

  return NextResponse.json({ success: true, ...body });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');

  if (pathStr === 'demo/clear') {
    return NextResponse.json({ deletedOrders: 0, message: 'Demo jobs preserved' });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');
  const body = await request.json().catch(() => ({}));

  if (pathStr.includes('/merchandising-followup')) {
    return NextResponse.json({ success: true, message: 'Merchandising follow-up updated', ...body });
  }

  if (pathStr.includes('/quantity')) {
    return NextResponse.json({ success: true, message: 'Order quantity revised successfully', newQuantity: body.newQuantity, warning: null });
  }

  return NextResponse.json({ success: true, ...body });
}
