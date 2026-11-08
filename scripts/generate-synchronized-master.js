/**
 * Synchronized Master Dataset Generator for NFL Pulse ERP (NOS)
 * 
 * Simulates a real factory with 5-6 months of continuous ERP usage (May 2026 - Nov 2026).
 * Ensures 100% logical consistency across all stages:
 * - Upstream stages are 100% complete for downstream active work.
 * - Every department has realistic active work, pending tasks, and historical records.
 * - Generates synchronized datasets for demo-2000-master.json, finished-bootstrap.json,
 *   cutting-production-master.json, yarn-stock-master.json, and knitting-execution-master.json.
 */

const fs = require('fs');
const path = require('path');

const TOTAL_JOBS = 2000;

const BUYERS = [
  { name: 'ONLY', raw: 'Bestseller ONLY', code: 'ONLY', share: 0.28 },
  { name: 'Name It', raw: 'Bestseller Name It', code: 'Name It', share: 0.28 },
  { name: 'OVS', raw: 'OVS S.p.A. Italy', code: 'OVS', share: 0.14 },
  { name: 'UTG', raw: 'United Textiles Group', code: 'UTG', share: 0.13 },
  { name: 'Only & Sons', raw: 'Bestseller Only & Sons', code: 'Only & Sons', share: 0.07 },
  { name: 'New Look', raw: 'New Look Retail Ltd', code: 'New Look', share: 0.04 },
  { name: 'T.M Lewin', raw: 'T.M Lewin London', code: 'T.M Lewin', share: 0.02 },
  { name: 'Miss Selfridge', raw: 'Miss Selfridge UK', code: 'Miss Selfridge', share: 0.015 },
  { name: 'Maurices', raw: 'Maurices Inc USA', code: 'Maurices', share: 0.015 },
  { name: "Anthony's", raw: "Anthony's Florida", code: "Anthony's", share: 0.005 },
  { name: "Sainsbury's", raw: "Sainsbury's Supermarkets Ltd", code: "Sainsbury's", share: 0.005 }
];

const MERCHANDISERS = {
  'ONLY': ['Md. Imran', 'Dalim', 'Shamoly', 'Jafar', 'Morad'],
  'Name It': ['Mahmud', 'Rizu', 'Shaker', 'Shovon'],
  'OVS': ['Basir Hossain', 'Ismail Shahin', 'Rana'],
  'UTG': ['Ayub', 'Rony', 'Imran'],
  'Only & Sons': ['Pavel', 'Shakel', 'Mainul'],
  'New Look': ['Nazrul', 'Sanaul', 'Kamruzzaman'],
  'T.M Lewin': ['Nazrul', 'Haider'],
  'Miss Selfridge': ['Nazrul', 'Sanaul'],
  'Maurices': ['Nazrul', 'Haider'],
  "Anthony's": ['Nazrul'],
  "Sainsbury's": ['Tariqul Islam']
};

const ITEMS = [
  { name: 'T-Shirt', smv: 6.8, fob: 3.15, fabric: '100% Combed Cotton Single Jersey', gsm: '160', dia: '76" Open' },
  { name: 'Polo Shirt', smv: 10.5, fob: 4.65, fabric: '100% Cotton Pique', gsm: '210', dia: '74" Open' },
  { name: 'Sweatshirt', smv: 11.8, fob: 6.20, fabric: 'CVC 60/40 French Terry', gsm: '260', dia: '72" Open' },
  { name: 'Hoodie', smv: 15.5, fob: 8.40, fabric: '80/20 Cotton Poly Fleece Brushed', gsm: '300', dia: '76" Open' },
  { name: 'Trouser', smv: 13.2, fob: 6.50, fabric: 'CVC 60/40 French Terry', gsm: '280', dia: '74" Open' },
  { name: 'Shorts', smv: 8.8, fob: 4.10, fabric: '100% Cotton French Terry Unbrushed', gsm: '240', dia: '72" Open' },
  { name: 'Jacket', smv: 24.5, fob: 13.80, fabric: '100% Polyester Bonded Fleece', gsm: '320', dia: '60" Open' },
  { name: 'Kids Romper', smv: 7.2, fob: 3.80, fabric: '100% Organic Cotton Single Jersey', gsm: '180', dia: '70" Open' },
  { name: 'Baby Bodysuit', smv: 5.4, fob: 2.90, fabric: '100% Cotton 1x1 Rib', gsm: '200', dia: '48" Tubular' },
  { name: 'Tank Top', smv: 5.8, fob: 2.75, fabric: '95/5 Cotton Lycra Rib 1x1', gsm: '220', dia: '48" Tubular' }
];

const COLORS = [
  { name: 'Navy Blazer', pantone: '19-3921 TPG' },
  { name: 'Jet Black', pantone: '19-0303 TCX' },
  { name: 'Bright White', pantone: '11-0601 TPG' },
  { name: 'Anthracite Melange', pantone: '19-4007 TPG' },
  { name: 'Heather Grey Melange', pantone: '14-4130 TCX' },
  { name: 'Racing Green', pantone: '19-5513 TPG' },
  { name: 'Coral Rose', pantone: '16-1632 TPG' },
  { name: 'Pink Melange', pantone: 'HUAFU-HH114' },
  { name: 'Vintage Blue', pantone: '17-4020 TPG' },
  { name: 'Mustard Gold', pantone: '14-0848 TPG' },
  { name: 'Burgundy Wine', pantone: '19-1617 TPG' },
  { name: 'Dusty Olive', pantone: '18-0317 TPG' }
];

const SPECIAL_PROCESSES = [
  'Standard Enzyme & Softener Wash',
  'All-Over Print (AOP) - Rotary Screen',
  'Mid Brush & Peach Finish',
  'Heavy Brush Fleece Finish',
  'Peach & Carbon Sueded Finish',
  'Chest Placement Print',
  'Chest Embroidery'
];

const FACTORIES = ['NFL', 'NCL'];
const FLOORS = ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'];
const LINES = ['Line 01', 'Line 02', 'Line 03', 'Line 04', 'Line 05', 'Line 06', 'Line 07', 'Line 08', 'Line 09', 'Line 10', 'Line 11', 'Line 12', 'Line 13', 'Line 14A', 'Line 14B', 'Line 15', 'Line 16A', 'Line 16B', 'Line 17', 'Line 18'];

function formatDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months[d.getMonth()];
  const y = d.getFullYear();
  return `${day}-${m}-${y}`;
}

function formatYearMonth(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, days) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

// Stage breakdown across 2,000 jobs (realistic 5-6 month active ERP distribution)
const STAGE_DISTRIBUTION = [
  { stage: 'Shipment', count: 850, statusText: 'Shipped', risk: 'ON_TRACK' },
  { stage: 'Packing', count: 120, statusText: 'In Packing & Cartons', risk: 'ON_TRACK' },
  { stage: 'Finishing', count: 150, statusText: 'Garment Finishing & QC', risk: 'ON_TRACK' },
  { stage: 'Sewing', count: 200, statusText: 'Sewing Running', risk: 'ON_TRACK' },
  { stage: 'Cutting / Print-Emb', count: 150, statusText: 'Cutting & Print In-Process', risk: 'ON_TRACK' },
  { stage: 'Fabric Ready', count: 150, statusText: 'Finished Fabric in Store', risk: 'ON_TRACK' },
  { stage: 'Dyeing', count: 180, statusText: 'Dyeing Batch Running', risk: 'ON_TRACK' },
  { stage: 'Knitting', count: 120, statusText: 'Circular Knitting Running', risk: 'ON_TRACK' },
  { stage: 'Yarn Store', count: 30, statusText: 'Yarn Indent / Delivery', risk: 'ON_TRACK' },
  { stage: 'T&A / Pre-production', count: 25, statusText: 'Planning T&A Approval Due', risk: 'ATTENTION' },
  { stage: 'Order Entry', count: 25, statusText: 'PO Confirmed / CAD Due', risk: 'ON_TRACK' }
];

console.log('Generating 2,000 jobs across 5-6 months factory history...');

const jobs = [];
const finishedBootstrapLines = [];
const cuttingRecords = [];
const dyeingBootstrapLines = [];
const greigeLinesG = [];
const dyeingBatches = [];
const cuttingHtmlDataL = [];
const cuttingHtmlDataP = [];
const knittingExecRows = [];

let jobCounter = 44001;
let idCounter = 1;

// Base date: 08-Nov-2026 (today)
const TODAY = new Date(2026, 10, 8); // month 10 is November (0-indexed)

STAGE_DISTRIBUTION.forEach(dist => {
  for (let i = 0; i < dist.count; i++) {
    // Pick buyer based on share
    const randBuyer = Math.random();
    let accumulated = 0;
    let buyer = BUYERS[0];
    for (const b of BUYERS) {
      accumulated += b.share;
      if (randBuyer <= accumulated) {
        buyer = b;
        break;
      }
    }

    const merchList = MERCHANDISERS[buyer.code] || MERCHANDISERS['ONLY'];
    const merchandiser = merchList[i % merchList.length];

    const itemObj = ITEMS[(jobCounter + i) % ITEMS.length];
    const colorObj = COLORS[(jobCounter + i) % COLORS.length];
    const processStr = SPECIAL_PROCESSES[(jobCounter + i) % SPECIAL_PROCESSES.length];

    // Order quantities: 1200 to 25000 pcs (realistic garment bulk quantities)
    const qtyTiers = [1500, 2400, 3200, 4800, 6000, 8500, 10000, 12500, 15000, 20000];
    const orderQty = qtyTiers[(jobCounter + i) % qtyTiers.length];

    // Job number generation (clean numeric sequence, plus occasional realistic repeat lot)
    const isRepeat = (i % 14 === 0 && dist.stage !== 'Order Entry');
    const baseJobNum = String(jobCounter);
    const jobNo = isRepeat ? `${baseJobNum} ${(i % 3) + 1}st` : baseJobNum;
    jobCounter++;

    const styleNo = `${buyer.code.replace(/[^A-Z]/g, '')}-${2026}${String((jobCounter * 3) % 9999).padStart(4, '0')}`;

    // Timeline based on stage
    // 5-6 months spread:
    // Shipment: PO received 110 to 180 days ago (shipped between June and Nov 2026)
    // Packing: PO received 80 to 105 days ago (shipping in next 5-10 days)
    // Finishing: PO received 70 to 90 days ago
    // Sewing: PO received 55 to 75 days ago
    // Cutting: PO received 40 to 55 days ago
    // Fabric Ready: PO received 32 to 44 days ago
    // Dyeing: PO received 25 to 37 days ago
    // Knitting: PO received 18 to 28 days ago
    // Yarn Store: PO received 10 to 18 days ago
    // Planning: PO received 5 to 11 days ago
    // Order Entry: PO received 1 to 5 days ago
    let daysAgo;
    if (dist.stage === 'Shipment') daysAgo = 110 + (i % 70);
    else if (dist.stage === 'Packing') daysAgo = 80 + (i % 25);
    else if (dist.stage === 'Finishing') daysAgo = 70 + (i % 20);
    else if (dist.stage === 'Sewing') daysAgo = 55 + (i % 20);
    else if (dist.stage === 'Cutting / Print-Emb') daysAgo = 40 + (i % 15);
    else if (dist.stage === 'Fabric Ready') daysAgo = 32 + (i % 12);
    else if (dist.stage === 'Dyeing') daysAgo = 25 + (i % 12);
    else if (dist.stage === 'Knitting') daysAgo = 18 + (i % 10);
    else if (dist.stage === 'Yarn Store') daysAgo = 10 + (i % 8);
    else if (dist.stage === 'T&A / Pre-production') daysAgo = 5 + (i % 6);
    else daysAgo = 1 + (i % 4);

    const poDate = addDays(TODAY, -daysAgo);
    const tnaPlanDate = addDays(poDate, 4);
    const yarnIndentDate = addDays(poDate, 6);
    const yarnInhouseDate = addDays(poDate, 14);
    const knitStartDate = addDays(poDate, 15);
    const knitEndDate = addDays(poDate, 24);
    const dyeStartDate = addDays(poDate, 26);
    const dyeEndDate = addDays(poDate, 38);
    const testCertDate = addDays(poDate, 40);
    const cutStartDate = addDays(poDate, 42);
    const cutEndDate = addDays(poDate, 48);
    const sewStartDate = addDays(poDate, 50);
    const sewEndDate = addDays(poDate, 68);
    const exFactoryDate = addDays(poDate, 78);
    const cargoClosingDate = addDays(exFactoryDate, 2);

    // Plan month string (e.g. "01-Aug-2026")
    const planMonth = `01-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][exFactoryDate.getMonth()]}-${exFactoryDate.getFullYear()}`;

    // Conversions
    const kgPerGarment = (Number(itemObj.gsm) * 0.001) * (itemObj.name.includes('Hoodie') || itemObj.name.includes('Trouser') ? 1.6 : itemObj.name.includes('Sweat') ? 1.2 : 0.75);
    const fabricReqKg = Math.round(orderQty * kgPerGarment);
    const yarnReqKg = Math.round(fabricReqKg * 1.05); // 5% process loss
    const greyReqKg = Math.round(fabricReqKg * 1.02);

    // Stage progress calculation based on stage
    let yarnRecv = 0, yarnIssued = 0, yarnStatus = 'PENDING';
    let greyProd = 0, knitStatus = 'PENDING';
    let dyeRecv = 0, dyeDelivered = 0, dyeStatus = 'PENDING';
    let cutQty = 0, cutStatus = 'PENDING';
    let printSend = 0, printRecv = 0, printStatus = 'N/A';
    let sewInput = 0, sewActual = 0, sewStatus = 'PENDING';
    let finQty = 0, packQty = 0, inspStatus = 'PENDING';
    let shipQty = 0, shipStatus = 'SCHEDULED';
    let trimsStatus = 'ORDERING_DUE', trimsChecklist = 'PENDING_REVIEW';
    let labDipStatus = 'SUBMITTED', labDipApproval = null;
    let testingStatus = 'WAITING_FABRIC', testingDecision = 'PENDING';

    const stage = dist.stage;

    // Upstream completion cascade (strictly enforced)
    if (['Shipment', 'Packing', 'Finishing', 'Sewing', 'Cutting / Print-Emb', 'Fabric Ready'].includes(stage)) {
      yarnRecv = yarnReqKg;
      yarnIssued = yarnReqKg;
      yarnStatus = 'COMPLETED';
      greyProd = greyReqKg;
      knitStatus = 'COMPLETED';
      dyeRecv = fabricReqKg;
      dyeDelivered = fabricReqKg;
      dyeStatus = 'COMPLETED';
      testingStatus = 'PASSED';
      testingDecision = 'PASS';
      trimsStatus = 'IN_HOUSE';
      trimsChecklist = 'ACCEPTED';
      labDipStatus = 'APPROVED';
      labDipApproval = 'Option B';
    } else if (stage === 'Dyeing') {
      yarnRecv = yarnReqKg;
      yarnIssued = yarnReqKg;
      yarnStatus = 'COMPLETED';
      greyProd = greyReqKg;
      knitStatus = 'COMPLETED';
      dyeRecv = Math.round(fabricReqKg * (0.35 + (i % 55) * 0.01));
      dyeDelivered = Math.round(dyeRecv * 0.85);
      dyeStatus = 'RUNNING';
      testingStatus = 'TEST_RUNNING';
      testingDecision = 'PENDING';
      trimsStatus = 'ORDERED';
      trimsChecklist = 'ACCEPTED';
      labDipStatus = 'APPROVED';
      labDipApproval = 'Option B';
    } else if (stage === 'Knitting') {
      yarnRecv = yarnReqKg;
      yarnIssued = yarnReqKg;
      yarnStatus = 'ISSUED_TO_KNITTING';
      greyProd = Math.round(greyReqKg * (0.30 + (i % 60) * 0.01));
      knitStatus = 'RUNNING';
      dyeStatus = 'WAITING_GREIGE';
      trimsStatus = 'ORDERED';
      trimsChecklist = 'ACCEPTED';
      labDipStatus = 'APPROVED';
      labDipApproval = 'Option B';
    } else if (stage === 'Yarn Store') {
      yarnRecv = Math.round(yarnReqKg * 0.65);
      yarnIssued = 0;
      yarnStatus = 'PARTIAL_RECEIVED';
      knitStatus = 'WAITING_YARN';
      dyeStatus = 'WAITING_GREIGE';
      trimsStatus = 'ORDERING_DUE';
      trimsChecklist = 'PENDING_REVIEW';
      labDipStatus = 'SUBMITTED';
    } else if (stage === 'T&A / Pre-production') {
      yarnRecv = 0;
      yarnIssued = 0;
      yarnStatus = 'INDENT_PENDING';
      knitStatus = 'WAITING_TNA';
      dyeStatus = 'WAITING_TNA';
      trimsStatus = 'ORDERING_DUE';
      trimsChecklist = 'PENDING_REVIEW';
      labDipStatus = 'SUBMITTED';
    } else if (stage === 'Order Entry') {
      yarnRecv = 0;
      yarnIssued = 0;
      yarnStatus = 'NOT_STARTED';
      knitStatus = 'NOT_STARTED';
      dyeStatus = 'NOT_STARTED';
      trimsStatus = 'NOT_STARTED';
      trimsChecklist = 'NOT_CREATED';
      labDipStatus = 'PENDING_SAMPLE';
    }

    // Downstream completion progression
    if (['Shipment', 'Packing', 'Finishing', 'Sewing'].includes(stage)) {
      cutQty = Math.round(orderQty * 1.02); // 2% safe cutting allowance
      cutStatus = 'COMPLETED';
      if (processStr.includes('Print') || processStr.includes('Embroidery')) {
        printSend = orderQty;
        printRecv = orderQty;
        printStatus = 'COMPLETED';
      }
      sewInput = orderQty;
    }

    if (['Shipment', 'Packing', 'Finishing'].includes(stage)) {
      sewActual = orderQty;
      sewStatus = 'COMPLETED';
    }

    if (['Shipment', 'Packing'].includes(stage)) {
      finQty = orderQty;
      inspStatus = 'PASSED';
    }

    if (stage === 'Shipment') {
      packQty = orderQty;
      shipQty = orderQty;
      shipStatus = 'SHIPPED';
    } else if (stage === 'Packing') {
      packQty = Math.round(orderQty * 0.85);
      shipQty = 0;
      shipStatus = 'PREPARING';
    } else if (stage === 'Finishing') {
      finQty = Math.round(orderQty * 0.70);
      packQty = Math.round(orderQty * 0.40);
      inspStatus = 'IN_PROGRESS';
    } else if (stage === 'Sewing') {
      sewActual = Math.round(orderQty * (0.35 + (i % 50) * 0.01));
      sewStatus = 'RUNNING';
    } else if (stage === 'Cutting / Print-Emb') {
      cutQty = Math.round(orderQty * (0.40 + (i % 50) * 0.01));
      cutStatus = 'RUNNING';
      if (processStr.includes('Print') || processStr.includes('Embroidery')) {
        printSend = cutQty;
        printRecv = Math.round(cutQty * 0.75);
        printStatus = 'RUNNING';
      }
    } else if (stage === 'Fabric Ready') {
      cutStatus = 'WAITING_MARKER';
    }

    const factory = FACTORIES[i % FACTORIES.length];
    const floor = FLOORS[i % FLOORS.length];
    const line = LINES[i % LINES.length];

    // Rack location in Finished Fabric Store
    const rackNo = `Rack R-${String((i % 24) + 1).padStart(2, '0')}`;
    const shelfNo = `Shelf S-${(i % 5) + 1}`;
    const rackShelf = stage === 'Shipment' ? 'Dispatched' : `${rackNo} ${shelfNo}`;

    const job = {
      id: `JOB-${jobNo}-${idCounter++}`,
      recordId: `DEMO-${String(i + 1).padStart(4, '0')}`,
      jobNo,
      buyer: buyer.name,
      buyerRaw: buyer.raw,
      buyerCode: buyer.code,
      styleNo,
      orderQty,
      item: itemObj.name,
      itemDescription: `${itemObj.name} in ${itemObj.fabric} (${itemObj.gsm} GSM) · ${colorObj.name}`,
      merchandiser,
      presentStatus: dist.statusText,
      overallStage: dist.stage,
      riskStatus: dist.risk,
      planMonth,
      dataQuality: 'SYNCHRONIZED_5M_ENTERPRISE_LIFECYCLE',
      fabric: {
        fabricType: itemObj.fabric,
        gsm: itemObj.gsm,
        widthDia: itemObj.dia,
        colors: colorObj.name,
        colorCount: (i % 2) + 1,
        fabricReqKg,
        fabricReceivedKg: dyeDelivered,
        fabricBalanceKg: Math.max(0, fabricReqKg - dyeDelivered),
        additionalProcess: processStr,
        dyeingFactory: factory,
        dyeBatchNo: `B-${26000 + (jobCounter % 4000)}`,
        rackLocation: rackShelf
      },
      yarn: {
        yarnReqKg,
        yarnReceivedKg: yarnRecv,
        yarnIssuedKg: yarnIssued,
        yarnBalanceKg: Math.max(0, yarnReqKg - yarnRecv),
        yarnLotNo: `YL-${buyer.code.slice(0, 3)}-${1000 + (i % 500)}`,
        spinningMill: ['Square Textiles Ltd', 'Badsha Textiles Ltd', 'Akij Textile Mills', 'Maksons Spinning'][i % 4],
        status: yarnStatus
      },
      knitting: {
        greyReqKg,
        greyProducedKg: greyProd,
        greyBalanceKg: Math.max(0, greyReqKg - greyProd),
        machineDia: itemObj.dia.includes('Tubular') ? '24" Tubular' : '34" Open Width',
        gauge: '28 GG',
        status: knitStatus
      },
      dyeingLab: {
        labDipNo: `LD-${buyer.code}-${String(1000 + (i % 800))}`,
        pantone: colorObj.pantone,
        optionApproved: labDipApproval || 'Option B (Pending)',
        deltaE: 0.42,
        status: labDipStatus,
        approvalDate: labDipApproval ? formatDate(addDays(poDate, 12)) : 'Pending'
      },
      testingLab: {
        reportNo: `TR-LAB-${26000 + (i % 2000)}`,
        shrinkageLength: '-2.4%',
        shrinkageWidth: '-1.8%',
        washFastness: 'Grade 4-5',
        rubbingDry: 'Grade 4-5',
        rubbingWet: 'Grade 4.0',
        pilling: 'Grade 4.0',
        overallDecision: testingDecision,
        status: testingStatus,
        certifiedDate: testingDecision === 'PASS' ? formatDate(testCertDate) : 'Under Evaluation'
      },
      trims: {
        status: trimsStatus,
        checklistStatus: trimsChecklist,
        orderDate: trimsStatus === 'IN_HOUSE' || trimsStatus === 'ORDERED' ? formatDate(addDays(poDate, 10)) : 'Pending',
        inHouseDate: trimsStatus === 'IN_HOUSE' ? formatDate(addDays(poDate, 22)) : 'Due ' + formatDate(addDays(poDate, 24)),
        threadStatus: trimsStatus === 'IN_HOUSE' ? 'ISSUED_BY_IE' : 'PENDING_IE',
        laceStatus: itemObj.name.includes('Bodysuit') || itemObj.name.includes('Romper') ? (trimsStatus === 'IN_HOUSE' ? 'CONFIRMED' : 'PENDING_TECH') : 'N/A',
        items: [
          { name: 'Main Woven Brand Label', supplier: 'Avery Dennison', status: trimsStatus === 'IN_HOUSE' ? 'In-house' : trimsStatus === 'ORDERED' ? 'Ordered' : 'Checklist Due' },
          { name: 'Care & Size Printed Label', supplier: 'SML Group', status: trimsStatus === 'IN_HOUSE' ? 'In-house' : trimsStatus === 'ORDERED' ? 'Ordered' : 'Checklist Due' },
          { name: 'Sewing Thread 100% Spun Poly', supplier: 'Coats Bangladesh', status: trimsStatus === 'IN_HOUSE' ? 'In-house' : 'Pending IE' },
          { name: 'Polybag Self-Adhesive', supplier: 'Prime Packaging', status: trimsStatus === 'IN_HOUSE' ? 'In-house' : trimsStatus === 'ORDERED' ? 'In Transit' : 'Checklist Due' },
          { name: 'Export Master Carton 5-Ply', supplier: 'Eco Carton Ltd', status: trimsStatus === 'IN_HOUSE' ? 'In-house' : trimsStatus === 'ORDERED' ? 'Ordered' : 'Checklist Due' }
        ]
      },
      cad: {
        markerEfficiency: '86.8%',
        consumptionPerDzn: Number((kgPerGarment * 12 * 1.04).toFixed(3)),
        status: ['Order Entry'].includes(stage) ? 'PENDING' : 'COMPLETED',
        fabricParts: itemObj.name.includes('Hoodie') 
          ? [{ part: 'Body', fabric: 'Fleece 300 GSM' }, { part: 'Cuff & Bottom', fabric: '2x2 Lycra Rib' }, { part: 'Hood Inner', fabric: 'Single Jersey' }]
          : [{ part: 'Body', fabric: itemObj.fabric }, { part: 'Neck Rib', fabric: '1x1 Lycra Rib' }]
      },
      cutting: {
        cuttingQty: cutQty,
        cuttingBalance: Math.max(0, orderQty - cutQty),
        shrinkageAdjusted: true,
        status: cutStatus
      },
      printEmb: {
        type: processStr.includes('Print') ? 'Screen Print' : processStr.includes('Embroidery') ? 'Embroidery' : 'None',
        reqQty: orderQty,
        sendQty: printSend,
        recvQty: printRecv,
        mill: 'Pakiza Printing Complex',
        status: printStatus
      },
      sewing: {
        readyForInput: cutQty,
        inputQty: sewInput,
        inputBalance: Math.max(0, cutQty - sewInput),
        inputStatus: sewInput >= cutQty && cutQty > 0 ? 'COMPLETED' : sewInput > 0 ? 'RUNNING' : 'PENDING',
        sewingActualQty: sewActual,
        sewingBalance: Math.max(0, orderQty - sewActual),
        achievementPct: orderQty > 0 ? Math.round((sewActual / orderQty) * 100) : 0,
        status: sewStatus
      },
      ie: {
        smv: itemObj.smv,
        machineQty: itemObj.name.includes('Hoodie') || itemObj.name.includes('Jacket') ? 28 : 18,
        manpower: itemObj.name.includes('Hoodie') || itemObj.name.includes('Jacket') ? 38 : 26,
        efficiencyPct: 82.5,
        dailyTarget: Math.round((60 / itemObj.smv) * 24 * 8 * 0.825),
        targetPerHour: Math.round((60 / itemObj.smv) * 24 * 0.825),
        bulletinStatus: 'RELEASED',
        bulletinReleaseDate: formatDate(addDays(poDate, 12))
      },
      lineAllocation: {
        factory,
        floor,
        line,
        secondaryLine: '',
        lineType: 'GENERAL',
        shiftMode: 'GENERAL',
        hours: 10,
        planStart: formatDate(sewStartDate),
        planEnd: formatDate(sewEndDate),
        status: sewStatus === 'COMPLETED' ? 'COMPLETED' : sewStatus === 'RUNNING' ? 'RUNNING' : 'ALLOCATED'
      },
      finishing: {
        finishingQty: finQty,
        packingQty: packQty,
        inspectionStatus: inspStatus
      },
      shipment: {
        shipQty,
        shipBalance: Math.max(0, orderQty - shipQty),
        status: shipStatus,
        exFactoryDate: formatDate(exFactoryDate),
        cargoClosingDate: formatDate(cargoClosingDate)
      },
      dates: {
        poReceived: formatDate(poDate),
        tnaPlan: formatDate(tnaPlanDate),
        cuttingStart: formatDate(cutStartDate),
        cuttingEnd: formatDate(cutEndDate),
        sewingStart: formatDate(sewStartDate),
        sewingEnd: formatDate(sewEndDate),
        exFactory: formatDate(exFactoryDate),
        cargoClosing: formatDate(cargoClosingDate)
      },
      remarks: isRepeat ? `Repeat order lot ${(i % 3) + 1}st` : `Confirmed production style ${styleNo}`
    };

    jobs.push(job);

    // Synchronize Finished Fabric Bootstrap line
    finishedBootstrapLines.push({
      m: formatYearMonth(exFactoryDate),
      b: buyer.code,
      j: jobNo,
      st: styleNo,
      c: colorObj.name,
      f: itemObj.fabric.split(' ')[0] || 'S/J',
      gsm: itemObj.gsm,
      dia: itemObj.dia,
      ap: processStr,
      rb: fabricReqKg,
      rl: Math.round(fabricReqKg * 0.08),
      vb: dyeDelivered,
      vl: Math.round(dyeDelivered * 0.08),
      ch: `CH-NFL-${2600 + (jobCounter % 500)}`,
      ae: formatDate(exFactoryDate),
      df: factory,
      tpe: formatDate(addDays(poDate, 20)),
      sl: '1',
      mr: merchandiser
    });

    // Synchronize Cutting Production Record
    cuttingRecords.push({
      id: `cut-${i + 1}`,
      buyer: buyer.name,
      jobNo,
      styleNo,
      color: colorObj.name,
      orderQty,
      dyeingPlanDate: formatDate(dyeStartDate),
      cuttingPlanDate: formatDate(cutStartDate),
      sewingFloor: floor,
      shipDate: formatDate(exFactoryDate),
      todayCutting: cutStatus === 'RUNNING' ? Math.round(orderQty * 0.15) : 0,
      totalCutting: cutQty,
      cuttingBalance: Math.max(0, orderQty - cutQty),
      todayPrintSent: 0,
      totalPrintSend: printSend,
      todayPrintReceived: 0,
      totalPrintReceive: printRecv,
      printBalance: Math.max(0, printSend - printRecv),
      readyForInput: cutQty,
      todayInput: sewStatus === 'RUNNING' ? Math.round(orderQty * 0.12) : 0,
      totalInput: sewInput,
      inputBalance: Math.max(0, cutQty - sewInput),
      printEmbType: processStr.includes('Print') ? 'Screen Print' : processStr.includes('Embroidery') ? 'Embroidery' : 'None',
      factoryName: factory === 'NCL' ? 'Northern Clothing Ltd (NCL)' : 'Northern Fashions Limited (NFL)',
      presentStatus: dist.statusText,
      remarks: job.remarks
    });

    // Synchronize Dyeing Bootstrap line
    const rb = Math.round(fabricReqKg * 0.92);
    const rl = Math.round(fabricReqKg * 0.08);
    const db = Math.round(dyeDelivered * 0.92);
    const dl = Math.round(dyeDelivered * 0.08);
    const vb = Math.round(dyeDelivered * 0.92);
    const vl = Math.round(dyeDelivered * 0.08);

    const aopTuple = processStr.includes('AOP')
      ? ['DB Tex', formatDateISO(addDays(dyeStartDate, 4)), '', rb, formatDateISO(addDays(dyeStartDate, 10)), '', rb - 4, -4]
      : undefined;
    const brushTuple = processStr.includes('Brush')
      ? ['Ceylon', formatDateISO(addDays(dyeStartDate, 5)), '', rb, formatDateISO(addDays(dyeStartDate, 8)), '', rb - 2, -2]
      : undefined;
    const peachTuple = processStr.includes('Peach')
      ? ['U-02', formatDateISO(addDays(dyeStartDate, 4)), '', rb, formatDateISO(addDays(dyeStartDate, 7)), '', rb - 1, -1]
      : undefined;

    const dLine = {
      id: `dl-${idCounter}`,
      m: formatYearMonth(exFactoryDate),
      b: buyer.code,
      j: jobNo,
      st: styleNo,
      ap: processStr,
      gsm: itemObj.gsm,
      dia: itemObj.dia,
      c: colorObj.name,
      f: itemObj.fabric.split(' ')[0] || 'S/J',
      rb,
      rl,
      rt: fabricReqKg,
      gb: Math.round(greyReqKg * 0.92),
      gl: Math.round(greyReqKg * 0.08),
      ks: formatDateISO(knitStartDate),
      ke: formatDateISO(knitEndDate),
      df: factory === 'NCL' ? 'NFL' : factory,
      bn: `B-${26000 + (jobCounter % 4000)}`,
      dd: formatDateISO(dyeEndDate),
      db,
      dl,
      dt: dyeDelivered,
      tps: formatDateISO(dyeStartDate),
      tpe: formatDateISO(dyeEndDate),
      as: formatDateISO(addDays(dyeStartDate, 1)),
      ae: formatDateISO(dyeEndDate),
      ch: `CH-NFL-${2600 + (jobCounter % 500)}`,
      vb,
      vl,
      vt: dyeDelivered,
      mr: merchandiser,
      sl: String((i % 4) + 1)
    };
    if (aopTuple) dLine.aop = aopTuple;
    if (brushTuple) dLine.brush = brushTuple;
    if (peachTuple) dLine.peach = peachTuple;

    dyeingBootstrapLines.push(dLine);

    // Synchronize Greige Store Line G
    greigeLinesG.push({
      m: formatYearMonth(exFactoryDate),
      b: buyer.code,
      j: jobNo,
      c: colorObj.name,
      ft: itemObj.fabric.split(' ')[0] || 'S/J',
      gsm: itemObj.gsm,
      dia: itemObj.dia,
      yb: job.yarn.spinningMill,
      yl: job.yarn.yarnLotNo,
      fq: fabricReqKg,
      gq: greyReqKg,
      rq: greyProd,
      rd: formatDateISO(knitEndDate),
      rc: `RC-GR-${2000 + (jobCounter % 400)}`,
      iq: dyeDelivered,
      id: formatDateISO(dyeStartDate),
      ic: `IC-GR-${3000 + (jobCounter % 400)}`,
      l1: (i % 5) + 1,
      kc: 'NFL',
      ks: formatDateISO(knitStartDate),
      ke: formatDateISO(knitEndDate),
      ds: formatDateISO(dyeStartDate),
      de: formatDateISO(dyeEndDate),
      sl: `${(i % 4) + 1}st`,
      sdf: factory === 'NCL' ? 'NFL' : factory
    });

    // Synchronize Dyeing Batch for Factory Data
    dyeingBatches.push({
      id: `BATCH-${jobNo}-${i + 1}`,
      batchNo: `B-${26000 + (jobCounter % 4000)}`,
      jobNo,
      buyer: buyer.name,
      styleNo,
      color: colorObj.name,
      fabricType: itemObj.fabric,
      gsm: itemObj.gsm,
      dia: itemObj.dia,
      factory: factory === 'NCL' ? 'NFL' : factory,
      status: dyeStatus === 'COMPLETED' ? 'DELIVERED' : dyeStatus === 'RUNNING' ? 'IN_PROCESS' : 'SCHEDULED',
      batchQtyKg: fabricReqKg,
      dyedQtyKg: dyeDelivered,
      deliveredQtyKg: dyeDelivered,
      balanceQtyKg: Math.max(0, fabricReqKg - dyeDelivered),
      startDate: formatDate(dyeStartDate),
      deliveryDate: formatDate(dyeEndDate),
      rftStatus: 'PASS',
      remarks: job.remarks
    });

    // Synchronize HTML Cutting & Input Dataset
    cuttingHtmlDataL.push({
      b: buyer.code,
      j: jobNo,
      st: styleNo,
      c: colorObj.name,
      oq: orderQty,
      fl: floor === 'Floor 1' ? 'S1' : floor === 'Floor 2' ? 'S2' : 'S3',
      sd: formatDateISO(exFactoryDate),
      cut: cutQty,
      psd: printSend,
      prc: printRecv,
      rfi: Math.max(0, cutQty - sewInput),
      inp: sewInput,
      pe: processStr.includes('Print') && processStr.includes('Embroidery') ? 'P+E' : processStr.includes('Print') ? 'P' : processStr.includes('Embroidery') ? 'E' : '',
      pf: factory
    });

    cuttingHtmlDataP.push({
      ln: line.replace('Line ', ''),
      b: buyer.code,
      j: jobNo,
      st: styleNo,
      it: itemObj.name,
      ped: processStr,
      ss: formatDateISO(sewStartDate),
      ccd: formatDateISO(cargoClosingDate),
      oq: orderQty,
      mc: itemObj.ie ? itemObj.ie.machineQty : (itemObj.name.includes('Hoodie') || itemObj.name.includes('Jacket') ? 28 : 18),
      smv: itemObj.smv,
      tgt: Math.round((60 / itemObj.smv) * 24 * 8 * 0.825),
      fq: fabricReqKg,
      fr: dyeDelivered,
      ps: dist.statusText,
      tr: trimsStatus === 'IN_HOUSE' ? 'ok' : 'Due ' + trimsStatus,
      cut: cutQty,
      psd: printSend,
      prc: printRecv,
      rfi: Math.max(0, cutQty - sewInput),
      inp: sewInput,
      ppos: processStr.includes('Print') ? 'Chest' : '',
      epos: processStr.includes('Embroidery') ? 'Chest' : '',
      mr: merchandiser,
      rm: job.remarks
    });

    // Synchronize Knitting Execution Row
    if (dist.stage === 'Knitting' || (dist.stage === 'Dyeing' && i < 20) || (dist.stage === 'Yarn Store' && i < 15)) {
      knittingExecRows.push({
        id: `KNT-${jobNo}`,
        jobNo,
        buyer: buyer.name,
        styleNo,
        colour: colorObj.name,
        fabricDescription: itemObj.fabric,
        gsm: itemObj.gsm,
        dia: itemObj.dia,
        yarnBrand: job.yarn.spinningMill,
        count: '30/1 Combed Cotton',
        lotNo: job.yarn.yarnLotNo,
        reqKg: greyReqKg,
        producedKg: greyProd,
        balanceKg: Math.max(0, greyReqKg - greyProd),
        machineNo: `MC-${String((i % 24) + 1).padStart(2, '0')}`,
        operator: ['Md. Al-Amin', 'Abdul Mannan', 'Rashedul', 'Shohel Rana', 'Kamrul'][i % 5],
        status: dist.stage === 'Knitting' ? 'RUNNING' : dist.stage === 'Yarn Store' ? 'WAITING_YARN' : 'COMPLETED',
        startDate: formatDate(knitStartDate),
        endDate: formatDate(knitEndDate),
        remarks: job.remarks
      });
    }
  }
});

// Summary compilation
const summary = {
  totalJobs: jobs.length,
  totalQtyPcs: jobs.reduce((s, j) => s + j.orderQty, 0),
  byBuyer: {},
  byMonth: {},
  byStage: {},
  byFactory: { NFL: 0, NCL: 0 }
};

jobs.forEach(j => {
  summary.byBuyer[j.buyer] = (summary.byBuyer[j.buyer] || 0) + 1;
  summary.byMonth[j.planMonth] = (summary.byMonth[j.planMonth] || 0) + 1;
  summary.byStage[j.overallStage] = (summary.byStage[j.overallStage] || 0) + 1;
  if (j.lineAllocation.factory === 'NCL') summary.byFactory.NCL++;
  else summary.byFactory.NFL++;
});

// 1. Write demo-2000-master.json
const masterPayload = {
  version: '3.1.0',
  description: 'NFL Pulse ERP · 2,000 Job Cohesive Lifecycle Master Dataset (5-6 Months Live Factory Usage May-Nov 2026)',
  generatedAt: new Date().toISOString(),
  summary,
  jobs
};

const masterPath = path.join(__dirname, '../apps/web/data/demo-2000-master.json');
fs.writeFileSync(masterPath, JSON.stringify(masterPayload, null, 2));

// 2. Write finished-bootstrap.json
const finishedPayload = {
  user: 'NOS Master Sync',
  asOf: '2026-11-08',
  lines: {
    F: finishedBootstrapLines,
    R: []
  },
  state: {
    lastSync: new Date().toISOString()
  }
};
const finishedPath = path.join(__dirname, '../apps/web/public/data/finished-bootstrap.json');
fs.writeFileSync(finishedPath, JSON.stringify(finishedPayload, null, 2));

// 3. Write cutting-production-master.json
const cuttingPayload = {
  records: cuttingRecords
};
const cuttingPath = path.join(__dirname, '../apps/web/data/cutting-production-master.json');
fs.writeFileSync(cuttingPath, JSON.stringify(cuttingPayload, null, 2));

// 4. Write dyeing-bootstrap.json
const dyeingBootstrapPath = path.join(__dirname, '../apps/web/public/data/dyeing-bootstrap.json');
let dyeingMachines = [];
try {
  const existingDyeing = JSON.parse(fs.readFileSync(dyeingBootstrapPath, 'utf8'));
  dyeingMachines = existingDyeing.machines || [];
} catch (e) {}

const dyeingPayload = {
  user: {
    id: 'u-admin',
    name: 'Managing Director / Factory Owner',
    roles: ['ADMIN', 'DYEING', 'MANAGEMENT'],
    uiRoles: ['Dyeing Planner', 'Greige Store', 'Dyeing Production', 'Planning & Control', 'Dyeing Lab']
  },
  asOf: '2026-11-08',
  machines: dyeingMachines.length > 0 ? dyeingMachines : [
    { id: 'MC-01', cap: 45, brand: 'FONGS' },
    { id: 'MC-02', cap: 50, brand: 'DILMENLER' },
    { id: 'MC-03', cap: 175, brand: 'DILMENLER' },
    { id: 'MC-04', cap: 525, brand: 'DILMENLER' },
    { id: 'MC-05', cap: 700, brand: 'DILMENLER' },
    { id: 'MC-06', cap: 1050, brand: 'DILMENLER' },
    { id: 'MC-07', cap: 1400, brand: 'DILMENLER' },
    { id: 'MC-08', cap: 1200, brand: 'DILMENLER' },
    { id: 'MC-09', cap: 75, brand: 'THIES' },
    { id: 'MC-10', cap: 450, brand: 'DILMENLER' },
    { id: 'MC-11', cap: 150, brand: 'DILMENLER' },
    { id: 'SM-01', cap: 10, brand: 'DILMENLER' },
    { id: 'SM-02', cap: 15, brand: 'DILMENLER' },
    { id: 'SM-03', cap: 15, brand: 'DILMENLER' },
    { id: 'SM-04', cap: 15, brand: 'DILMENLER' },
    { id: 'SM-05', cap: 25, brand: 'DILMENLER' },
    { id: 'SM-06', cap: 25, brand: 'DILMENLER' },
    { id: 'SM-07', cap: 25, brand: 'DILMENLER' },
    { id: 'SM-08', cap: 50, brand: 'DILMENLER' },
    { id: 'SM-09', cap: 50, brand: 'DILMENLER' }
  ],
  lines: dyeingBootstrapLines
};
fs.writeFileSync(dyeingBootstrapPath, JSON.stringify(dyeingPayload));

// 5. Write greige-bootstrap.json
const greigeBootstrapPath = path.join(__dirname, '../apps/web/public/data/greige-bootstrap.json');
let greigeAdvanceLines = [];
try {
  const existingGreige = JSON.parse(fs.readFileSync(greigeBootstrapPath, 'utf8'));
  greigeAdvanceLines = existingGreige.lines?.A || [];
} catch (e) {}

const greigePayload = {
  user: {
    id: 'u-admin',
    name: 'Managing Director / Factory Owner',
    roles: ['ADMIN', 'GREIGE_STORE', 'MANAGEMENT'],
    uiRoles: ['Greige Store', 'Knitting', 'Knit Quality', 'Dyeing Planner', 'Merchandiser', 'Management']
  },
  asOf: '2026-11-08',
  lines: {
    G: greigeLinesG,
    A: greigeAdvanceLines
  },
  state: {
    lastSync: new Date().toISOString()
  }
};
fs.writeFileSync(greigeBootstrapPath, JSON.stringify(greigePayload));

// 6. Write dyeing-factory-data.json
const dyeingFactoryDataPath = path.join(__dirname, '../apps/web/data/dyeing-factory-data.json');
let dfMachines = [];
let dfSubContractors = ['Pakiza', 'Scandex', 'Newage', 'Rupa', 'Knitex', 'DB Tex', 'Ceylon'];
try {
  const existingDF = JSON.parse(fs.readFileSync(dyeingFactoryDataPath, 'utf8'));
  if (existingDF.machines) dfMachines = existingDF.machines;
  if (existingDF.subContractors) dfSubContractors = existingDF.subContractors;
} catch (e) {}

const dfPayload = {
  company: 'Northern Fashion Ltd.',
  importedAt: new Date().toISOString(),
  machines: dfMachines,
  subContractors: dfSubContractors,
  dyeingBatches: dyeingBatches,
  executionRows: dyeingBatches,
  deliveryRows: dyeingBatches.filter(b => b.status === 'DELIVERED'),
  summary: {
    totalBatches: dyeingBatches.length,
    totalBatchKg: dyeingBatches.reduce((s, b) => s + b.batchQtyKg, 0),
    deliveredKg: dyeingBatches.reduce((s, b) => s + b.deliveredQtyKg, 0),
    inProcessKg: dyeingBatches.filter(b => b.status === 'IN_PROCESS').reduce((s, b) => s + b.batchQtyKg, 0),
    rftRatePct: 98.4
  }
};
fs.writeFileSync(dyeingFactoryDataPath, JSON.stringify(dfPayload, null, 2));

// 7. Write yarn-stock-master.json
const totalYarnReq = jobs.reduce((s, j) => s + (j.yarn?.yarnReqKg || 0), 0);
const totalYarnRcv = jobs.reduce((s, j) => s + (j.yarn?.yarnReceivedKg || 0), 0);
const yarnPayload = {
  reportDate: '2026-11-08',
  summary: {
    totalStockKg: totalYarnRcv,
    totalStockTons: Number((totalYarnRcv / 1000).toFixed(2)),
    whiteStockKg: Math.round(totalYarnRcv * 0.45),
    whiteStockTons: Number(((totalYarnRcv * 0.45) / 1000).toFixed(2)),
    colorStockKg: Math.round(totalYarnRcv * 0.55),
    colorStockTons: Number(((totalYarnRcv * 0.55) / 1000).toFixed(2)),
    pipelineLcOpenKg: Math.round(totalYarnReq * 0.08),
    pipelineLcOpenTons: Number(((totalYarnReq * 0.08) / 1000).toFixed(2)),
    openRequisitionsKg: Math.max(0, totalYarnReq - totalYarnRcv),
    openRequisitionsTons: Number((Math.max(0, totalYarnReq - totalYarnRcv) / 1000).toFixed(2)),
    deadStockKg: 14200,
    deadStockTons: 14.2,
    deadStockCount: 8,
    safetyStockShortageCount: 4,
    avgDailyDeliveryKg: 38500,
    avgDailyDeliveryTons: 38.5
  },
  safetyStockAlerts: [
    { count: '28/1 Cotton Melange', currentStockKg: 1200, safetyBufferKg: 8000, deficitKg: 6800, status: 'CRITICAL' },
    { count: '34/1 Combed Cotton', currentStockKg: 2100, safetyBufferKg: 10000, deficitKg: 7900, status: 'CRITICAL' },
    { count: '26/1 CVC 60/40', currentStockKg: 950, safetyBufferKg: 6000, deficitKg: 5050, status: 'CRITICAL' },
    { count: '30/1 Lycra 5%', currentStockKg: 400, safetyBufferKg: 3500, deficitKg: 3100, status: 'CRITICAL' }
  ]
};
const yarnPath = path.join(__dirname, '../apps/web/data/yarn-stock-master.json');
fs.writeFileSync(yarnPath, JSON.stringify(yarnPayload, null, 2));

// 8. Write knitting-execution-master.json
const totalGreyReq = jobs.reduce((s, j) => s + (j.knitting?.greyReqKg || 0), 0);
const totalGreyProd = jobs.reduce((s, j) => s + (j.knitting?.greyProducedKg || 0), 0);
const knittingPayload = {
  reportDate: '2026-11-08',
  productionDate: '2026-11-07',
  summary: {
    totalKnittingPlanKg: totalGreyReq,
    totalKnittingPlanTons: Number((totalGreyReq / 1000).toFixed(2)),
    totalKnittingProductionKg: totalGreyProd,
    totalKnittingProductionTons: Number((totalGreyProd / 1000).toFixed(2)),
    totalMachinesRunning: 107,
    totalActiveJobs: knittingExecRows.length,
    bookedCapacityPct: 94,
    loadedCapacityPct: 89
  },
  slotDeliveryComparison: [
    { slot: 'Slot 1 (D01-08)', requiredDeliveryTons: 118.5, deliveredTons: 121.2, status: 'ON_TRACK' },
    { slot: 'Slot 2 (D09-16)', requiredDeliveryTons: 115.0, deliveredTons: 112.4, status: 'SLIGHT_DELAY' },
    { slot: 'Slot 3 (D17-24)', requiredDeliveryTons: 122.0, deliveredTons: 119.8, status: 'ON_TRACK' },
    { slot: 'Slot 4 (D25-30)', requiredDeliveryTons: 113.1, deliveredTons: 115.2, status: 'ON_TRACK' }
  ],
  yarnShortageDelayedJobs: jobs
    .filter(j => j.overallStage === 'Knitting' || j.overallStage === 'Yarn Store')
    .slice(0, 8)
    .map(j => ({
      jobNo: j.jobNo,
      buyer: j.buyer,
      count: '30/1 Combed Cotton',
      shortageKg: Math.round(j.yarn.yarnReqKg * 0.15),
      delayDays: 3
    })),
  rows: knittingExecRows
};
const knittingPath = path.join(__dirname, '../apps/web/data/knitting-execution-master.json');
fs.writeFileSync(knittingPath, JSON.stringify(knittingPayload, null, 2));

// 9. Synchronize cutting HTML
const cuttingHtmlPath = path.join(__dirname, '../apps/web/public/cutting/index.html');
if (fs.existsSync(cuttingHtmlPath)) {
  let html = fs.readFileSync(cuttingHtmlPath, 'utf8');
  const cuttingDataRegex = /const DATA=\{.*?\};<\/script>/s;
  const newCuttingDataStr = `const DATA=${JSON.stringify({ L: cuttingHtmlDataL, P: cuttingHtmlDataP })};</script>`;
  if (cuttingDataRegex.test(html)) {
    html = html.replace(cuttingDataRegex, newCuttingDataStr);
    fs.writeFileSync(cuttingHtmlPath, html, 'utf8');
    console.log('Cutting HTML (public/cutting/index.html) successfully updated with synchronized dataset.');
  }
}

console.log('=== SUCCESS: COMPILED 2,000 COHESIVE JOBS MASTER DATA ===');
console.log('Master file written to:', masterPath);
console.log('Finished Fabric bootstrap written to:', finishedPath);
console.log('Cutting production written to:', cuttingPath);
console.log('Total Jobs:', summary.totalJobs);
console.log('Total Order Qty (Pcs):', summary.totalQtyPcs.toLocaleString());
console.log('By Stage:', summary.byStage);
console.log('By Buyer:', summary.byBuyer);
console.log('By Month:', summary.byMonth);
console.log('By Factory:', summary.byFactory);
