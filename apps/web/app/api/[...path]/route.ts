import { NextRequest, NextResponse } from 'next/server';
import demo2000DataRaw from '../../../data/demo-2000-master.json';
import factoryDataRaw from '../../../data/dyeing-factory-data.json';

const masterJobs = (demo2000DataRaw as any)?.jobs || [];
const factoryData = factoryDataRaw as any;

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

  // 10. /api/masters/references
  if (pathStr === 'masters/references') {
    const cat = request.nextUrl.searchParams.get('category') || 'BUYER';
    if (cat === 'BUYER') {
      return NextResponse.json([
        { id: 'b-1', value: 'Name It' }, { id: 'b-2', value: 'ONLY' }, { id: 'b-3', value: 'OVS' },
        { id: 'b-4', value: 'UTG' }, { id: 'b-5', value: 'Only & Sons' }, { id: 'b-6', value: 'New Look' },
        { id: 'b-7', value: 'T.M Lewin' }, { id: 'b-8', value: 'Miss Selfridge' }, { id: 'b-9', value: 'Maurices' }
      ]);
    }
    if (cat === 'SEWING_LINE') {
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
    // NFL 52 lines
    for (let i = 1; i <= 26; i++) {
      lines.push({
        id: `nfl-${i}A`, code: `${i}A`, name: `${i}A`,
        floor: { code: 'FL-01', name: 'Floor 1', section: { code: 'SEC-SEW', name: 'Sewing Section', factory: { code: 'NFL', name: 'Northern Fashions Ltd' } } }
      });
      lines.push({
        id: `nfl-${i}B`, code: `${i}B`, name: `${i}B`,
        floor: { code: 'FL-02', name: 'Floor 2', section: { code: 'SEC-SEW', name: 'Sewing Section', factory: { code: 'NFL', name: 'Northern Fashions Ltd' } } }
      });
    }
    // NCL 39 lines
    for (let i = 1; i <= 20; i++) {
      lines.push({
        id: `ncl-${i}A`, code: `${i}A`, name: `${i}A`,
        floor: { code: 'S-01', name: 'S-01 Floor', section: { code: 'SEC-SEW', name: 'Sewing Section', factory: { code: 'NCL', name: 'Northern Clothing Ltd' } } }
      });
      if (i <= 19) {
        lines.push({
          id: `ncl-${i}B`, code: `${i}B`, name: `${i}B`,
          floor: { code: 'S-02', name: 'S-02 Floor', section: { code: 'SEC-SEW', name: 'Sewing Section', factory: { code: 'NCL', name: 'Northern Clothing Ltd' } } }
        });
      }
    }
    return NextResponse.json(lines);
  }

  // /api/planning/gantt
  if (pathStr === 'planning/gantt') {
    const list = masterJobs.slice(0, 150).map((j: any) => ({
      id: j.id,
      jobNo: j.jobNo,
      buyer: j.buyer,
      buyerCode: j.buyer,
      styleId: `s-${j.jobNo}`,
      styleNo: j.styleNo,
      itemDescription: j.itemDescription,
      orderQty: j.orderQty,
      ganttPlan: {
        factoryCode: j.lineAllocation?.factory || 'NFL',
        lineCode: j.lineAllocation?.line || '1A',
        startDate: j.dates?.sewingStart || '2026-08-15',
        endDate: j.dates?.sewingEnd || '2026-08-25',
        status: 'RELEASED',
        dailyTarget: j.ie?.dailyTarget || 1800,
        smv: j.ie?.smv || 7.5,
        manpower: j.ie?.manpower || 30,
        efficiencyPct: j.ie?.efficiencyPct || 80
      }
    }));
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

  // Default fallback for any other GET
  return NextResponse.json({ status: 'ok', path: pathStr, totalJobs: masterJobs.length });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');

  if (pathStr === 'demo/load') {
    return NextResponse.json({ createdOrders: 2000, message: 'All 2,000 jobs loaded and active' });
  }

  return NextResponse.json({ success: true, message: `Action on ${pathStr} recorded successfully` });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join('/');

  if (pathStr === 'demo/clear') {
    return NextResponse.json({ deletedOrders: 0, message: 'Demo jobs preserved' });
  }

  return NextResponse.json({ success: true });
}
