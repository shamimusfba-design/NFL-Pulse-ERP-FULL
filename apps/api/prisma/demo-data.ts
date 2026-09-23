import { Prisma, PrismaClient } from '@prisma/client';

const DEMO_BATCH = 'NFL-DEMO-50-V2';

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isoDate(base: Date, days: number) {
  return addDays(base, days).toISOString();
}

function splitInteger(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map((v) => Math.floor(v));
  let remain = total - out.reduce((a, b) => a + b, 0);
  for (let i = 0; remain > 0; i = (i + 1) % out.length) {
    out[i] += 1;
    remain -= 1;
  }
  return out;
}

function buildBreakdown(total: number, buyerCode: string, index: number) {
  const adultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const kidsSizes = ['92-96', '98-102', '104-110', '116-122', '128-134'];
  const ageSizes = ['2-3Y', '3-4Y', '4-5Y', '5-6Y', '7-8Y'];
  const sizes = buyerCode === 'NAMEIT' ? kidsSizes : buyerCode === 'UTG' && index % 2 === 0 ? ageSizes : adultSizes;
  const colors = buyerCode === 'OVS'
    ? ['Lavender Lustre', 'Naval Academy']
    : buyerCode === 'ONLY'
      ? ['Cloud Dancer', 'Black']
      : buyerCode === 'ONLYSONS'
        ? ['Black', 'Balsam Green']
        : buyerCode === 'UTG'
          ? ['Light Taupe', 'Black']
          : ['Navy', 'Pink'];
  const colorTotals = splitInteger(total, [55, 45]);
  const rows: Array<{ color: string; size: string; qty: number }> = [];
  colors.forEach((color, colorIndex) => {
    const sizeTotals = splitInteger(colorTotals[colorIndex], sizes.map((_, i) => [8, 18, 28, 24, 14, 8][i] || 10));
    sizes.forEach((size, i) => rows.push({ color, size, qty: sizeTotals[i] }));
  });
  return rows;
}

const buyerTemplates = [
  { code: 'ONLY', name: 'ONLY', baseStyle: '15323159', item: 'ONLRILEY O-NECK L/S TOP JRS NOOS', qty: 49292, fob: 4.65 },
  { code: 'NAMEIT', name: 'NAME IT', baseStyle: 'NAMEIT-DEMO', item: 'Kids Jersey Style', qty: 18000, fob: 3.85 },
  { code: 'ONLYSONS', name: 'ONLY & SONS', baseStyle: 'ONS-DEMO', item: 'Jersey / Sweat Style', qty: 22000, fob: 5.15 },
  { code: 'OVS', name: 'OVS', baseStyle: '271PJA416SP-903', item: '416PJA SHORT+ SCRITTA', qty: 43366, fob: 3.41 },
  { code: 'UTG', name: 'UTG', baseStyle: 'EO-SS26-D030-CK', item: 'Production Card Style 56319', qty: 1400, fob: 4.25 },
];

const TASK_OWNER_ROLE: Record<string, string> = {
  CAD: 'CAD', 'T&A': 'PLANNING', IE: 'IE', YARN: 'YARN_MANAGEMENT', PROCUREMENT: 'PROCUREMENT', KNITTING: 'KNITTING', DYEING: 'DYEING',
  CUTTING: 'CUTTING', PRINTING: 'PRINTING', EMBROIDERY: 'EMBROIDERY', SEWING: 'SEWING', QUALITY: 'QUALITY', FINISHING: 'FINISHING', SHIPMENT: 'SHIPMENT', SAMPLE: 'SAMPLE',
};

const taskTemplates = [
  ['CAD', 'CAD consumption required'], ['T&A', 'Prepare / approve T&A'], ['IE', 'IE bulletin pending'],
  ['YARN', 'Yarn requirement follow-up'], ['PROCUREMENT', 'PI / LC / ETA follow-up'],
  ['KNITTING', 'Knitting program / yarn readiness'], ['DYEING', 'Dyeing delivery follow-up'],
  ['CUTTING', 'Cutting execution follow-up'], ['PRINTING', 'Print send / receive follow-up'],
  ['EMBROIDERY', 'Embroidery send / receive follow-up'], ['SEWING', 'Sewing production follow-up'],
  ['QUALITY', 'Quality observation follow-up'], ['FINISHING', 'Finishing / packing follow-up'],
  ['SHIPMENT', 'Shipment readiness follow-up'], ['SAMPLE', 'Sample / approval follow-up'],
] as const;

function qtyByProgress(total: number, progress: number) {
  return Math.max(0, Math.min(total, Math.round(total * progress)));
}

function sectionStatus(done: number, required: number, hold = false) {
  if (hold) return 'Hold';
  if (done <= 0) return 'Pending';
  if (done >= required) return 'Complete';
  return 'Running';
}

function buildLeadTime(base: Date, index: number, outsidePrint: boolean, hasEmb: boolean, progress: number) {
  const delay = (index % 5) - 1; // -1 to +3 days for demo variance
  const stages = [
    ['CAD / Consumption', 0, 2, 0.08],
    ['IE Bulletin', 0, 3, 0.10],
    ['Yarn / Material Readiness', 2, 7, 0.16],
    ['Knitting', 6, 11, 0.26],
    ['Dyeing / Finishing', 10, 15, 0.40],
    ['Cutting', 15, 18, 0.55],
    ...(outsidePrint ? [['Printing', 18, 21, 0.64] as [string, number, number, number]] : []),
    ...(hasEmb ? [['Embroidery', 18, 22, 0.66] as [string, number, number, number]] : []),
    ['Sewing', 21, 29, 0.76],
    ['Finishing / Packing', 28, 33, 0.90],
    ['Shipment', 34, 36, 1.00],
  ] as Array<[string, number, number, number]>;

  return stages.map(([section, startOffset, finishOffset, threshold], stageIndex) => {
    const reached = progress + 0.16 >= threshold;
    const completed = progress >= threshold;
    const actualVariance = delay + (stageIndex % 3 === 0 ? 1 : 0);
    return {
      section,
      plannedStart: isoDate(base, startOffset + (index % 3)),
      plannedFinish: isoDate(base, finishOffset + (index % 3)),
      actualStart: reached ? isoDate(base, startOffset + (index % 3) + Math.max(0, actualVariance - 1)) : null,
      actualFinish: completed ? isoDate(base, finishOffset + (index % 3) + actualVariance) : null,
      varianceDays: completed ? actualVariance : null,
      status: completed ? (actualVariance > 0 ? 'Late' : 'On Time') : reached ? 'In Progress' : 'Not Started',
      reason: completed && actualVariance > 1 ? ['Material readiness', 'Quality reprocess', 'Capacity load', 'Outside process'][index % 4] : null,
    };
  });
}


function demoPlanning(ccd: Date, index: number, approved: boolean, outsidePrint: boolean, hasEmb: boolean) {
  const val = (offset: number) => isoDate(ccd, offset);
  return {
    taStatus: approved ? 'APPROVED' : 'DRAFT', autoSuggested: true,
    yarnDyeingStart: val(-44), yarnDyeingEnd: val(-39), knittingStart: val(-38), knittingEnd: val(-32),
    dyeingFinishingStart: val(-31), dyeingFinishingEnd: val(-25), aopStart: val(-25), aopEnd: val(-23),
    ppMeetingDate: val(-25), fileHandoverDate: val(-23), trimsInhouseDate: val(-20), cuttingStart: val(-22), cuttingEnd: val(-19),
    printingStart: val(-19), printingEnd: val(-16), embroideryStart: val(-19), embroideryEnd: val(-15),
    sewingStartDate: val(-16), sewingEnd: val(-7), finishingEnd: val(-4), preFinalInspection: val(-3), finalInspection: val(-2), exFactoryDate: val(-1), cargoClosingDate: val(0),
    printPlan: outsidePrint ? 'OUTSIDE' : 'IN_HOUSE', embroideryPlan: hasEmb && index % 9 === 0 ? 'OUTSIDE' : 'IN_HOUSE',
    printOutsidePlan: outsidePrint, embroideryOutsidePlan: hasEmb && index % 9 === 0,
  };
}

function buildQualityHistory(base: Date, index: number, flows: Record<string, number>, hasPrint: boolean, hasEmb: boolean) {
  const stages = [
    { section: 'Knitting', reached: flows.knitting > 0, downstream: flows.dyeing > 0 },
    { section: 'Dyeing', reached: flows.dyeing > 0, downstream: flows.cutting > 0 },
    { section: 'Cutting', reached: flows.cutting > 0, downstream: hasPrint ? flows.printing > 0 : hasEmb ? flows.embroidery > 0 : flows.sewing > 0 },
    ...(hasPrint ? [{ section: 'Printing', reached: flows.printing > 0, downstream: flows.sewing > 0 }] : []),
    ...(hasEmb ? [{ section: 'Embroidery', reached: flows.embroidery > 0, downstream: flows.sewing > 0 }] : []),
    { section: 'Sewing', reached: flows.sewing > 0, downstream: flows.finishing > 0 },
    { section: 'Finishing', reached: flows.finishing > 0, downstream: flows.shipment > 0 },
  ];
  const remarks = [
    null,
    'Minor observation recorded; corrected before release.',
    'Shade / lot segregation noted for downstream control.',
    'Process check completed with observation.',
    'Rework completed and released.',
  ];
  return stages.map((s, idx) => ({
    section: s.section,
    releaseStatus: s.downstream ? 'RELEASED' : s.reached ? (index % 13 === 0 && idx === 1 ? 'HOLD' : 'IN PROCESS') : 'NOT REACHED',
    releasedAt: s.downstream ? isoDate(base, 6 + idx * 4 + (index % 4)) : null,
    remark: s.reached && (index + idx) % 4 === 1 ? remarks[(index + idx) % remarks.length] : null,
    enteredBy: `${s.section} quality responsible`,
    source: 'Section / floor quality release',
  }));
}

function buildTestReports(base: Date, index: number, jobNo: string) {
  const firstFail = index % 11 === 0;
  return [
    {
      reportType: 'CF Test',
      reportRef: `CF-${jobNo}-01`,
      testDate: isoDate(base, 12 + (index % 9)),
      result: firstFail ? 'FAIL' : 'PASS',
      remarks: firstFail ? 'Initial result needs review / retest.' : 'Within test requirement.',
      attachmentName: `CF Test Report ${jobNo}.pdf`,
      retest: firstFail ? { reportRef: `CF-${jobNo}-R1`, testDate: isoDate(base, 14 + (index % 9)), result: 'PASS' } : null,
    },
    {
      reportType: 'Inhouse Pilling Test',
      reportRef: `PILL-${jobNo}-01`,
      testDate: isoDate(base, 13 + (index % 9)),
      result: index % 17 === 0 ? 'PENDING' : 'PASS',
      remarks: index % 17 === 0 ? 'Report entry pending.' : 'Test completed.',
      attachmentName: `Pilling Test ${jobNo}.pdf`,
      retest: null,
    },
  ];
}

export async function clearDemoData(prisma: PrismaClient) {
  const rows = await prisma.order.findMany({ select: { id: true, sourceMetadata: true } });
  const ids = rows
    .filter((row) => (row.sourceMetadata as any)?.demoData === true || String((row.sourceMetadata as any)?.demoBatch || '').startsWith('NFL-DEMO-50'))
    .map((row) => row.id);
  if (!ids.length) return { deletedOrders: 0 };
  const result = await prisma.order.deleteMany({ where: { id: { in: ids } } });
  return { deletedOrders: result.count };
}

export async function loadDemoData(prisma: PrismaClient, createdById: string) {
  await clearDemoData(prisma);
  const factory = await prisma.factory.upsert({ where: { code: 'NFL' }, update: { name: 'Northern Fashion Limited', active: true }, create: { code: 'NFL', name: 'Northern Fashion Limited' } });
  const sewingLines = await prisma.line.findMany({ where: { active: true, floor: { section: { code: { startsWith: 'SEW' }, factory: { active: true } } } }, include: { floor: { include: { section: { include: { factory: true } } } } } });
  const buyers = new Map<string, { id: string; code: string; name: string }>();
  for (const t of buyerTemplates) {
    const buyer = await prisma.buyer.upsert({ where: { code: t.code }, update: { name: t.name, active: true }, create: { code: t.code, name: t.name } });
    buyers.set(t.code, buyer);
  }

  const merchUsers = await prisma.user.findMany({ where: { active: true, roles: { some: { role: { code: { in: ['MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'] } } } } }, orderBy: { email: 'asc' } });
  const base = new Date('2026-09-23T00:00:00.000Z');
  let created = 0;
  const sectionSummary: Record<string, number> = {};

  for (let i = 0; i < 50; i += 1) {
    const t = buyerTemplates[i % buyerTemplates.length];
    const buyer = buyers.get(t.code)!;
    const jobNo = String(990001 + i);
    const styleNo = i < buyerTemplates.length ? t.baseStyle : `${t.baseStyle}-${String(i + 1).padStart(2, '0')}`;
    const qtyFactor = [1, 0.72, 0.48, 1.18, 0.36][i % 5];
    const quantity = Math.max(1200, Math.round(t.qty * qtyFactor));
    const breakdowns = buildBreakdown(quantity, t.code, i);
    const ccd = addDays(base, 18 + (i % 48));
    const poNo = i === 0 ? 'NOF4754793' : i === 3 ? 'OVS-6084236-L1' : i === 4 ? 'PO2356063C' : `DEMO-PO-${String(i + 1).padStart(3, '0')}`;

    const progress = [0.18, 0.34, 0.52, 0.71, 0.88][i % 5];
    const garmentKg = 0.19 + (i % 4) * 0.025;
    const fabricRequired = Number((quantity * garmentKg).toFixed(2));
    const yarnRequired = Number((fabricRequired * 1.035).toFixed(2));
    const yarnAvailable = Number((yarnRequired * Math.min(1, progress + 0.28)).toFixed(2));
    const knittingKg = Number((fabricRequired * Math.min(1, progress + 0.10)).toFixed(2));
    const greigeReceivedKg = Number((knittingKg * 0.99).toFixed(2));
    const dyeingKg = Number((fabricRequired * Math.max(0, progress - 0.02)).toFixed(2));
    const finishedFabricKg = Number((dyeingKg * 0.97).toFixed(2));
    const cuttingQty = qtyByProgress(quantity, Math.max(0, progress - 0.12));
    const hasPrint = i % 3 === 0;
    const hasEmb = i % 4 === 0;
    const printQty = hasPrint ? qtyByProgress(quantity, Math.max(0, progress - 0.18)) : 0;
    const embroideryQty = hasEmb ? qtyByProgress(quantity, Math.max(0, progress - 0.20)) : 0;
    const inputQty = qtyByProgress(quantity, Math.max(0, progress - 0.24));
    const sewingQty = qtyByProgress(quantity, Math.max(0, progress - 0.30));
    const finishingQty = qtyByProgress(quantity, Math.max(0, progress - 0.37));
    const packedQty = qtyByProgress(quantity, Math.max(0, progress - 0.42));
    const shippedQty = qtyByProgress(quantity, Math.max(0, progress - 0.52));
    const outsidePrint = hasPrint && i % 7 === 0;
    const taApproved = i % 4 !== 0;
    const statusCycle = ['DONE', 'PENDING', 'DONE', 'OVERDUE'] as const;
    const actionStatus = statusCycle[i % statusCycle.length];
    const task = taskTemplates[i % taskTemplates.length];
    sectionSummary[task[0]] = (sectionSummary[task[0]] || 0) + 1;
    const planFactoryCode = i % 3 === 0 ? 'NCL' : 'NFL';
    const factoryLines = sewingLines.filter((l:any) => l.floor.section.factory.code === planFactoryCode).sort((a:any,b:any)=>Number(a.code.replace(/\D/g,''))-Number(b.code.replace(/\D/g,'')));
    const planLine = factoryLines.length ? factoryLines[i % factoryLines.length] : null;

    const flows = { knitting: knittingKg, dyeing: dyeingKg, cutting: cuttingQty, printing: printQty, embroidery: embroideryQty, sewing: sewingQty, finishing: finishingQty, shipment: shippedQty };
    const qualityHold = i % 13 === 0;
    const leadTimeHistory = buildLeadTime(base, i, hasPrint, hasEmb, progress);
    const qualityHistory = buildQualityHistory(base, i, flows, hasPrint, hasEmb);
    const testReports = buildTestReports(base, i, jobNo);

    const production = {
      fabricRequired,
      knittingQty: Number(knittingKg.toFixed(2)), knittingBalance: Number(Math.max(0, fabricRequired - knittingKg).toFixed(2)),
      dyeingQty: Number(dyeingKg.toFixed(2)), dyeingBalance: Number(Math.max(0, fabricRequired - dyeingKg).toFixed(2)),
      cuttingQty, cuttingBalance: Math.max(0, quantity - cuttingQty),
      printQty, printBalance: hasPrint ? Math.max(0, quantity - printQty) : 0,
      embroideryQty, embroideryBalance: hasEmb ? Math.max(0, quantity - embroideryQty) : 0,
      inputQty, inputBalance: Math.max(0, quantity - inputQty),
      sewingQty, sewingBalance: Math.max(0, quantity - sewingQty),
      finishingQty, finishingBalance: Math.max(0, quantity - finishingQty),
      packedQty, packedBalance: Math.max(0, quantity - packedQty),
      shippedQty, shipmentBalance: Math.max(0, quantity - shippedQty),
    };

    const sectionData = {
      yarn: { requiredKg: yarnRequired, availableKg: yarnAvailable, shortageKg: Number(Math.max(0, yarnRequired - yarnAvailable).toFixed(2)), count: ['30/1', '34/1', '26/1', '40/1'][i % 4], type: ['BCI', 'Organic', 'Cotton', 'PC'][i % 4], pipelineKg: Number((yarnRequired * 0.18).toFixed(2)), nextEta: isoDate(base, 4 + (i % 12)), status: yarnAvailable >= yarnRequired ? 'Ready' : yarnAvailable >= yarnRequired * 0.75 ? 'Low' : 'Critical' },
      procurement: { requirementSource: i % 2 === 0 ? 'Merch Forecast' : 'Safety / Order Coverage', supplier: ['Supplier A', 'Supplier B', 'Local Mill', 'Import Mill'][i % 4], piNo: `PI-${260900 + i}`, lcNo: i % 4 === 2 ? null : `LC-${260700 + i}`, etd: isoDate(base, -3 + (i % 7)), eta: isoDate(base, 5 + (i % 12)), orderedKg: Number((yarnRequired * 0.22).toFixed(2)), receivedKg: i % 5 === 0 ? 0 : Number((yarnRequired * 0.06).toFixed(2)), status: i % 5 === 0 ? 'In Transit' : 'Partial / Follow-up' },
      yarnStore: { physicalKg: yarnAvailable, reservedKg: Number((yarnAvailable * 0.72).toFixed(2)), freeKg: Number((yarnAvailable * 0.28).toFixed(2)), lot: `YL-${String(i + 1).padStart(3, '0')}`, location: `Y-${(i % 5) + 1}` },
      yarnDyeing: { greySentKg: Number((fabricRequired * 0.08).toFixed(2)), dyedReceivedKg: Number((fabricRequired * 0.065).toFixed(2)), dyedIssuedKg: Number((fabricRequired * 0.05).toFixed(2)), balanceKg: Number((fabricRequired * 0.015).toFixed(2)), color: breakdowns[0]?.color || '—' },
      knitting: { requiredKg: fabricRequired, producedKg: knittingKg, balanceKg: Number(Math.max(0, fabricRequired - knittingKg).toFixed(2)), diaGroup: i % 2 === 0 ? '30–32' : '34–38', fabricCategory: ['Single Jersey', 'Rib', 'Terry'][i % 3], yarnCount: ['25/1', '30/1', '34/1', '40/1'][i % 4], plannedStart: isoDate(base, 6 + (i % 3)), actualStart: knittingKg > 0 ? isoDate(base, 6 + (i % 3) + (i % 2)) : null, status: sectionStatus(knittingKg, fabricRequired) },
      greigeStore: { receivedKg: greigeReceivedKg, issuedToDyeingKg: Number(Math.min(greigeReceivedKg, dyeingKg * 1.01).toFixed(2)), balanceKg: Number(Math.max(0, greigeReceivedKg - dyeingKg * 1.01).toFixed(2)), status: greigeReceivedKg > 0 ? 'Available / Issuing' : 'Pending' },
      dyeing: { requiredKg: fabricRequired, deliveredKg: dyeingKg, balanceKg: Number(Math.max(0, fabricRequired - dyeingKg).toFixed(2)), batches: Math.max(1, Math.ceil(dyeingKg / 350)), rftPct: 88 + (i % 10), reprocessCount: i % 9 === 0 ? 1 : 0, status: sectionStatus(dyeingKg, fabricRequired, qualityHold && cuttingQty === 0) },
      labTesting: { overallStatus: testReports.some((r) => r.result === 'FAIL') ? 'Review / Retest' : testReports.some((r) => r.result === 'PENDING') ? 'Pending' : 'Released', reports: testReports },
      fabricFinishing: { receivedKg: dyeingKg, finishedKg: finishedFabricKg, balanceKg: Number(Math.max(0, dyeingKg - finishedFabricKg).toFixed(2)), processes: i % 6 === 0 ? ['Peach'] : i % 7 === 0 ? ['AOP'] : ['Standard Finish'], status: finishedFabricKg > 0 ? 'Running / Complete by lot' : 'Pending' },
      finishedFabricStore: { receivedKg: finishedFabricKg, issuedToCuttingKg: Number((finishedFabricKg * Math.min(1, progress + 0.15)).toFixed(2)), balanceKg: Number((finishedFabricKg * Math.max(0, 0.85 - progress)).toFixed(2)), status: finishedFabricKg > 0 ? 'Available' : 'Pending' },
      cutting: { orderQty: quantity, cutQty: cuttingQty, balanceQty: Math.max(0, quantity - cuttingQty), floor: `Cutting-${(i % 3) + 1}`, status: sectionStatus(cuttingQty, quantity) },
      printing: { applicable: hasPrint, plan: outsidePrint ? 'OUTSIDE' : 'IN_HOUSE', sendQty: hasPrint ? Math.min(cuttingQty, Math.round(quantity * Math.max(0, progress - 0.15))) : 0, receiveQty: printQty, balanceQty: hasPrint ? Math.max(0, quantity - printQty) : 0, workOrder: outsidePrint ? (i % 2 === 0 ? 'Pending' : 'Issued') : 'N/A', status: hasPrint ? sectionStatus(printQty, quantity) : 'N/A' },
      embroidery: { applicable: hasEmb, sendQty: hasEmb ? Math.min(cuttingQty, Math.round(quantity * Math.max(0, progress - 0.16))) : 0, receiveQty: embroideryQty, balanceQty: hasEmb ? Math.max(0, quantity - embroideryQty) : 0, status: hasEmb ? sectionStatus(embroideryQty, quantity) : 'N/A' },
      sewing: { inputQty, productionQty: sewingQty, balanceQty: Math.max(0, quantity - sewingQty), line: planLine ? `${planFactoryCode} · ${planLine.name}` : `NFL · Line ${(i % 26) + 1}`, target: 1200 + (i % 6) * 120, efficiencyPct: 58 + (i % 26), dhu: Number((3.8 + (i % 9) * 0.45).toFixed(2)), status: sectionStatus(sewingQty, quantity) },
      finishing: { receivedQty: sewingQty, finishedQty: finishingQty, packedQty, balanceQty: Math.max(0, quantity - finishingQty), status: sectionStatus(finishingQty, quantity) },
      shipment: { orderQty: quantity, packedQty, shippedQty, balanceQty: Math.max(0, quantity - shippedQty), ccd: ccd.toISOString(), status: shippedQty >= quantity ? 'Shipped' : packedQty > quantity * 0.75 ? 'Preparing' : 'Not Ready' },
      quality: { latestStatus: qualityHold ? 'Attention' : 'Released / Monitoring', latestDhu: Number((3.8 + (i % 9) * 0.45).toFixed(2)), history: qualityHistory },
      trims: { requiredItems: 8 + (i % 7), orderedItems: 8 + (i % 7), inhouseItems: Math.max(0, 6 + (i % 8)), inhousePct: 72 + (i % 29), status: i % 8 === 0 ? 'Late / Short' : 'Following T&A' },
      cad: { status: i % 3 === 0 ? 'Pending Consumption' : 'Consumption Confirmed', fabricRequiredKg: fabricRequired, colorCount: new Set(breakdowns.map((b) => b.color)).size },
      ie: { bulletinStatus: i % 5 === 0 ? 'Pending' : 'Completed', smv: Number((8.5 + (i % 13) * 0.65).toFixed(2)), manpower: 28 + (i % 16), machineQty: 26 + (i % 13), achievableEfficiencyPct: 55 + (i % 31), dailyTarget: 1200 + (i % 6) * 120 },
      ieDailyTarget: { targetQty: 1200 + (i % 6) * 120, actualQty: Math.round((1200 + (i % 6) * 120) * (0.72 + (i % 24) / 100)), achievementPct: 72 + (i % 24), status: i % 7 === 0 ? 'Below Target' : 'Monitoring' },
      ieNpt: { minutes: (i % 6) * 18, reason: ['No Input', 'Machine Breakdown', 'Quality Hold', 'Style Change', 'No NPT', 'Operator Gap'][i % 6], status: i % 6 === 4 ? 'Clear' : 'Recorded' },
      ieSkillMatrix: { operators: 34 + (i % 12), multiSkillOperators: 9 + (i % 10), criticalOperationGap: i % 9 === 0 ? 2 : 0, status: i % 9 === 0 ? 'Gap' : 'Ready' },
      ieCheckpoints: { firstHour: 110 + (i % 35), fourthHour: 520 + (i % 110), eighthHour: 1050 + (i % 260), otHour: i % 3 === 0 ? 240 + (i % 90) : 0, target: 1200 + (i % 6) * 120, status: i % 8 === 0 ? 'Recovery Needed' : 'Tracking' },
      sample: { sampleType: ['Development', 'SMS', 'PP', 'Fit'][i % 4], knittingKg: 5 + (i % 18), knittingColors: 1 + (i % 4), dyeingBatches: 1 + (i % 3), printStyles: hasPrint ? 1 : 0, printPcs: hasPrint ? 12 + (i % 30) : 0, makingStyles: 1, status: i % 7 === 0 ? 'Capacity Attention' : 'On Track' },
      specialProcess: { applicable: i % 6 === 0, process: i % 6 === 0 ? 'Wash / Sequins' : 'N/A', sendQty: i % 6 === 0 ? Math.round(cuttingQty * 0.35) : 0, receiveQty: i % 6 === 0 ? Math.round(cuttingQty * 0.29) : 0, status: i % 6 === 0 ? 'Running' : 'N/A' },
    };

    const styleMeta = {
      demoData: true, demoBatch: DEMO_BATCH, demoIndex: i + 1, itemImageUrl: null,
      fobPrice: Number((t.fob + (i % 4) * 0.12).toFixed(2)),
      merchandisingFollowUp: {
        fabricOrderSheetStatus: i % 5 === 0 ? 'PENDING' : 'DONE', labDipStatus: actionStatus,
        printStrikeOffStatus: hasPrint ? actionStatus : 'NA', trimsOrderingStatus: i % 6 === 0 ? 'OVERDUE' : 'DONE',
        fileHandoverStatus: taApproved && i % 5 !== 1 ? 'DONE' : 'PENDING', workOrderStatus: outsidePrint ? (i % 2 === 0 ? 'PENDING' : 'DONE') : 'NA',
        presentStatus: ['Order Confirmed', 'Fabric / Yarn Follow-up', 'Cutting Running', 'Sewing Running', 'Finishing / Shipment'][i % 5],
        remarks: `Demo follow-up ${i + 1}; temporary test record`,
      },
      planning: demoPlanning(ccd, i, taApproved, outsidePrint, hasEmb),
      ganttPlan: taApproved ? { status: 'DRAFT', factoryCode: planFactoryCode, factoryName: planLine?.floor.section.factory.name, floorCode: planLine?.floor.code, floorName: planLine?.floor.name, lineId: planLine?.id, lineCode: planLine?.name || `Line ${(i % (planFactoryCode === 'NCL' ? 22 : 26)) + 1}`, startDate: isoDate(ccd, -16), finishDate: isoDate(ccd, -7 + (i % 3)), workingHours: 8, baseDailyTarget: 1200 + (i % 6) * 120, dailyTarget: 1200 + (i % 6) * 120, bufferDays: 7 - (i % 3), risk: i % 9 === 0 ? 'RISK' : 'ON_TRACK', version: 1, demo: true } : null,
      production,
      sectionData,
      qualityHistory,
      testReports,
      leadTimeHistory,
      demoSectionStatus: {
        yarn: sectionData.yarn.status, procurement: sectionData.procurement.status, 'yarn-store': 'Stock Available', 'yarn-dyeing': sectionData.yarnDyeing.balanceKg > 0 ? 'Balance' : 'Clear',
        knitting: sectionData.knitting.status, 'greige-store': sectionData.greigeStore.status, dyeing: sectionData.dyeing.status, lab: sectionData.labTesting.overallStatus,
        'fabric-finishing': sectionData.fabricFinishing.status, 'finished-fabric': sectionData.finishedFabricStore.status, cutting: sectionData.cutting.status,
        printing: sectionData.printing.status, embroidery: sectionData.embroidery.status, sewing: sectionData.sewing.status, finishing: sectionData.finishing.status,
        quality: sectionData.quality.latestStatus, shipment: sectionData.shipment.status,
      },
    };

    const orderMeta = {
      demoData: true, demoBatch: DEMO_BATCH, demoIndex: i + 1,
      demoSource: i < 5 ? 'User-provided buyer/style examples + generated demo execution history' : 'User-provided NFL workflow/report fields + generated demo execution history',
      taPlan: { status: taApproved ? 'APPROVED' : 'DRAFT' }, documents: {},
      cadConsumption: i % 3 === 0 ? null : { status: 'CONFIRMED', demo: true, rows: breakdowns.slice(0, 2).map((b, idx) => ({ styleId: 'DEMO_STYLE', color: b.color, orderQty: idx === 0 ? Math.round(quantity * 0.55) : quantity - Math.round(quantity * 0.55), fabricDescription: 'Demo fabric requirement', consumptionBasis: 'KG_PCS', consumptionValue: Number((fabricRequired / quantity).toFixed(4)), wastagePct: 5, requiredKg: Number((fabricRequired * (idx === 0 ? 0.55 : 0.45)).toFixed(2)) })) },
    };

    await prisma.order.create({
      data: {
        jobNo, factoryId: factory.id, buyerId: buyer.id, merchandiserId: merchUsers.length ? merchUsers[i % merchUsers.length].id : createdById, source: 'MANUAL', totalQty: quantity,
        sourceMetadata: json(orderMeta), confirmedAt: addDays(base, -(i % 14)), createdById,
        styles: { create: [{ styleNo, itemDescription: t.item, quantity, collection: ['NOOS', 'SS26', 'AW26', '20271'][i % 4], season: ['SS26', 'AW26', 'NOOS'][i % 3], sourceMetadata: json(styleMeta), breakdowns: { create: breakdowns }, purchaseOrders: { create: [{ poNumber: poNo, totalQty: quantity, ccd, shipmentDate: ccd, destination: t.code === 'OVS' ? 'OVS Market Mix' : undefined, market: t.code === 'OVS' ? ['Italy', 'Warm', 'Middle East'][i % 3] : undefined, sourceMetadata: json({ demoData: true, demoBatch: DEMO_BATCH }) }] } }] },
        tasks: { create: [
          { title: `CAD consumption required · Job ${jobNo}`, module: 'CAD', entityType: 'ORDER', entityId: `DEMO-CAD-${jobNo}`, ownerRoleCode: 'CAD', status: i % 3 === 0 ? 'PENDING' : 'COMPLETED', priority: 'HIGH', dueAt: addDays(base, 1 + (i % 4)), completedAt: i % 3 === 0 ? undefined : addDays(base, -(i % 5)) },
          { title: `IE / Operation Bulletin · Job ${jobNo}`, module: 'IE', entityType: 'ORDER', entityId: `DEMO-IE-${jobNo}`, ownerRoleCode: 'IE', status: i % 5 === 0 ? 'PENDING' : 'COMPLETED', priority: 'HIGH', dueAt: addDays(base, 2 + (i % 5)), completedAt: i % 5 === 0 ? undefined : addDays(base, -(i % 4)) },
          { title: `T&A review / approval · Job ${jobNo}`, module: 'T&A', entityType: 'ORDER', entityId: `DEMO-TA-${jobNo}`, ownerRoleCode: 'PLANNING', status: taApproved ? 'COMPLETED' : 'PENDING', priority: 'HIGH', dueAt: addDays(base, 3 + (i % 5)), completedAt: taApproved ? addDays(base, -(i % 3)) : undefined },
          { title: `${task[1]} · Job ${jobNo}`, module: task[0], entityType: 'ORDER', entityId: `DEMO-${jobNo}`, ownerRoleCode: TASK_OWNER_ROLE[task[0]] || task[0], status: i % 6 === 0 ? 'BLOCKED' : i % 3 === 0 ? 'IN_PROGRESS' : 'PENDING', priority: i % 10 === 0 ? 'CRITICAL' : i % 4 === 0 ? 'HIGH' : 'NORMAL', dueAt: addDays(base, (i % 12) - 2), blockedReason: i % 6 === 0 ? 'Demo dependency / material or approval pending' : undefined },
        ] },
      },
    });
    created += 1;
  }
  return { createdOrders: created, demoBatch: DEMO_BATCH, sectionSummary };
}

export async function demoStatus(prisma: PrismaClient) {
  const rows = await prisma.order.findMany({ select: { id: true, sourceMetadata: true } });
  const demoRows = rows.filter((row) => (row.sourceMetadata as any)?.demoData === true || String((row.sourceMetadata as any)?.demoBatch || '').startsWith('NFL-DEMO-50'));
  return { demoBatch: DEMO_BATCH, demoOrders: demoRows.length, loaded: demoRows.length > 0 };
}
