import fs from 'fs';
import path from 'path';

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const csvPath = path.resolve('public/assets/aistudio/Sewing_Line_Plan___Execution_Follow__Up_2862b2aa');
const masterJobsPath = path.resolve('apps/web/data/demo-2000-master.json');

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const lines = csvRaw.split(/\r?\n/).filter(l => l.trim().length > 0);

const masterJson = JSON.parse(fs.readFileSync(masterJobsPath, 'utf8'));
const masterJobs = masterJson.jobs || [];

const jobMap = new Map();
for (const j of masterJobs) {
  if (j.jobNo) jobMap.set(String(j.jobNo).trim(), j);
}

const rows = [];
// CSV header is at line 1 (index 1), data starts from index 2
for (let i = 2; i < lines.length; i++) {
  const line = lines[i];
  if (!line || !line.trim()) continue;
  const cols = parseCSVLine(line);
  if (!cols[0] && !cols[3]) continue; // skip blank lines

  const rawLine = cols[0] || '';
  const slNo = cols[1] || '';
  const buyerRaw = cols[2] || '';
  const rawJob = cols[3] || '';
  const rawStyle = cols[4] || '';
  const rawItem = cols[5] || '';
  const printEmbDesc = cols[6] || '';
  const sewStartDate = cols[7] || '';
  const ccd = cols[8] || '';
  const oldCcd = cols[9] || '';
  const week = cols[10] || '';
  const actualSewStart = cols[11] || '';
  const rawOrderQty = cols[12] || '0';
  const rawNoOfMc = cols[13] || '';
  const rawSmv = cols[14] || '';
  const rawTgt = cols[15] || '';
  const rawFabReq = cols[16] || '';
  const rawFabRcv = cols[17] || '';
  const rawFabBal = cols[18] || '';
  const rawBalPct = cols[19] || '';
  const fileHandover = cols[20] || '';
  const ppStatus = cols[21] || '';
  const ppsSendDate = cols[22] || '';
  const rawPresentStatus = cols[23] || '';
  const trimsStatus = cols[24] || '';
  const rawCutQty = cols[25] || '0';
  const rawCutBal = cols[26] || '0';
  const rawPrintSent = cols[27] || '0';
  const rawPrintRcv = cols[28] || '0';
  const rawReadyInput = cols[29] || '0';
  const rawLastDayInput = cols[30] || '0';
  const rawInputQty = cols[31] || '0';
  const rawInputBal = cols[32] || '0';
  const rawPackQty = cols[33] || '0';
  const rawPackBal = cols[34] || '0';
  const rawShipQty = cols[35] || '0';
  const rawShipBal = cols[36] || '0';
  const printPos = cols[37] || '';
  const embPos = cols[38] || '';
  const merchant = cols[39] || '';
  const planFailReason = cols[40] || '';
  const remarks = cols[41] || '';
  const line2 = cols[42] || rawLine;
  const priority = cols[43] || '';
  const presentStageNo = cols[44] || '';
  const dyeingEndTna = cols[45] || '';
  const aopTnaEnd = cols[46] || '';
  const delayDays1 = cols[47] || '';
  const trimsTna = cols[48] || '';
  const delayDays2 = cols[49] || '';
  const cd = cols[50] || '';
  const requireDays = cols[51] || '';

  // Extract clean job number digits
  const jobMatch = rawJob.match(/(\d{4,6})/);
  const cleanJobNo = jobMatch ? jobMatch[1] : '';

  const matchedJob = cleanJobNo ? jobMap.get(cleanJobNo) : null;

  const buyer = (buyerRaw && buyerRaw !== '0') ? buyerRaw : (matchedJob ? matchedJob.buyer : 'ONL');
  const style = (rawStyle && rawStyle !== '0') ? rawStyle : (matchedJob ? matchedJob.styleNo : `STY-${cleanJobNo || i}`);
  const item = (rawItem && rawItem !== '0') ? rawItem : (matchedJob ? matchedJob.item : 'Basic Tee');
  const merchantName = (merchant && merchant !== '0') ? merchant : (matchedJob ? matchedJob.merchandiser : 'Production Dept');

  let orderQty = parseInt(rawOrderQty, 10) || 0;
  if (orderQty === 0 && matchedJob) {
    orderQty = matchedJob.orderQty || 5000;
  }
  if (orderQty === 0) orderQty = 4500;

  let noOfMc = parseInt(rawNoOfMc, 10);
  if (isNaN(noOfMc) || noOfMc <= 0) {
    noOfMc = matchedJob?.ie?.machineQty || 20;
  }

  let smv = parseFloat(rawSmv);
  if (isNaN(smv) || smv <= 0) {
    smv = matchedJob?.ie?.smv || 7.5;
  }

  let dailyTarget = parseInt(rawTgt, 10);
  if (isNaN(dailyTarget) || dailyTarget <= 0) {
    dailyTarget = matchedJob?.ie?.dailyTarget || Math.round((noOfMc * 10 * 60 * 0.75) / (smv || 7.5));
  }

  // Fabric
  let fabReqKg = parseFloat(rawFabReq);
  if (isNaN(fabReqKg) || fabReqKg <= 0) {
    fabReqKg = matchedJob?.fabric?.fabricReqKg || Math.round(orderQty * 0.22);
  }
  let fabRcvKg = parseFloat(rawFabRcv);
  if (isNaN(fabRcvKg) || fabRcvKg <= 0) {
    fabRcvKg = matchedJob?.fabric?.fabricReceivedKg || fabReqKg;
  }
  const fabBalKg = Math.max(0, fabReqKg - fabRcvKg);
  const fabBalPct = fabReqKg > 0 ? (fabBalKg / fabReqKg) * 100 : 0;

  // Status mapping
  let presentStatus = rawPresentStatus;
  if (!presentStatus || presentStatus === '0' || presentStatus === '#ERROR!') {
    if (matchedJob?.presentStatus) {
      presentStatus = matchedJob.presentStatus;
    } else {
      presentStatus = 'Sewing Running';
    }
  }

  // Cutting & Production
  let cuttingQty = parseInt(rawCutQty, 10) || 0;
  if (cuttingQty === 0 && matchedJob?.cutting?.cuttingQty) {
    cuttingQty = matchedJob.cutting.cuttingQty;
  }
  if (cuttingQty === 0) {
    if (presentStatus === 'Sewing Completed' || presentStatus === 'Cut OK') {
      cuttingQty = orderQty;
    } else if (presentStatus === 'Sewing Running') {
      cuttingQty = Math.round(orderQty * 0.9);
    } else {
      cuttingQty = Math.round(orderQty * 0.5);
    }
  }
  const cuttingBal = Math.max(0, orderQty - cuttingQty);

  let printSent = parseInt(rawPrintSent, 10) || 0;
  let printRcv = parseInt(rawPrintRcv, 10) || 0;
  if (printSent === 0 && matchedJob?.printEmb) {
    printSent = matchedJob.printEmb.sendQty || cuttingQty;
    printRcv = matchedJob.printEmb.recvQty || cuttingQty;
  }

  let readyForInput = parseInt(rawReadyInput, 10) || 0;
  if (readyForInput === 0) {
    readyForInput = cuttingQty;
  }

  let inputQty = parseInt(rawInputQty, 10) || 0;
  if (inputQty === 0 && matchedJob?.sewing?.inputQty) {
    inputQty = matchedJob.sewing.inputQty;
  }
  if (inputQty === 0) {
    if (presentStatus === 'Sewing Completed') inputQty = cuttingQty;
    else if (presentStatus === 'Sewing Running') inputQty = Math.round(cuttingQty * 0.7);
    else inputQty = Math.round(cuttingQty * 0.2);
  }
  const inputBal = Math.max(0, orderQty - inputQty);

  let packingQty = parseInt(rawPackQty, 10) || 0;
  if (packingQty === 0 && matchedJob?.finishing?.packingQty) {
    packingQty = matchedJob.finishing.packingQty;
  }
  if (packingQty === 0) {
    if (presentStatus === 'Sewing Completed') packingQty = inputQty;
    else if (presentStatus === 'Sewing Running') packingQty = Math.round(inputQty * 0.6);
  }
  const packingBal = Math.max(0, orderQty - packingQty);

  let shipQty = parseInt(rawShipQty, 10) || 0;
  if (shipQty === 0 && matchedJob?.shipment?.shipQty) {
    shipQty = matchedJob.shipment.shipQty;
  }
  if (shipQty === 0 && presentStatus === 'Sewing Completed') {
    shipQty = packingQty;
  }
  const shipBalance = Math.max(0, orderQty - shipQty);

  // Line assignment
  const assignedLine = rawLine || (matchedJob?.lineAllocation?.line ? String(matchedJob.lineAllocation.line).replace(/[^A-Za-z0-9]/g, '').slice(0, 2) : 'A');

  const row = {
    id: `SPL-${i - 1}`,
    line: assignedLine,
    slNo: slNo || String(i - 1),
    buyer,
    job: rawJob || `JOB-${cleanJobNo || i}`,
    cleanJobNo,
    style,
    item,
    printEmbDesc: printEmbDesc && printEmbDesc !== '0' ? printEmbDesc : 'None',
    sewingStartDate: sewStartDate && sewStartDate !== '0' ? sewStartDate : (matchedJob?.dates?.sewingStart || '15-Sep-2026'),
    ccd: ccd && ccd !== '0' ? ccd : (matchedJob?.dates?.exFactory || '30-Dec-2026'),
    oldCcd: oldCcd && oldCcd !== '0' ? oldCcd : '',
    week: week && week !== '0' ? week : '52W',
    actualSewingStart: actualSewStart && actualSewStart !== '0' ? actualSewStart : '',
    orderQty,
    noOfMc,
    smv,
    dailyTarget,
    fabReqKg: Math.round(fabReqKg),
    fabRcvKg: Math.round(fabRcvKg),
    fabBalKg: Math.round(fabBalKg),
    fabBalPct: Number(fabBalPct.toFixed(1)),
    fileHandoverDate: fileHandover && fileHandover !== '0' ? fileHandover : '30/Dec',
    ppStatus: ppStatus && ppStatus !== '#N/A' ? ppStatus : 'Approved',
    ppsSendDate: ppsSendDate && ppsSendDate !== '#N/A' ? ppsSendDate : '',
    presentStatus,
    trimsStatus: trimsStatus && trimsStatus !== '#ERROR!' ? trimsStatus : 'In-House OK',
    cuttingQty,
    cuttingBal,
    printSent,
    printRcv,
    readyForInput,
    lastDayInput: parseInt(rawLastDayInput, 10) || Math.round(dailyTarget * 0.9),
    inputQty,
    inputBal,
    packingQty,
    packingBal,
    shipQty,
    shipBalance,
    printPosition: printPos && printPos !== '0' ? printPos : 'Chest',
    embriodaryPosition: embPos && embPos !== '0' ? embPos : 'Sleeve',
    merchantName,
    planFailReason: planFailReason || '',
    remarks: remarks || '',
    secondaryLine: line2 || assignedLine,
    priority: priority || 'Normal',
    presentStageNo: presentStageNo && presentStageNo !== '#REF!' ? presentStageNo : '3',
    dyeingEndTna: dyeingEndTna && dyeingEndTna !== '0' ? dyeingEndTna : '10-Sep-2026',
    aopTnaEnd: aopTnaEnd || '',
    delayDays1: parseInt(delayDays1, 10) || 0,
    trimsTna: trimsTna && trimsTna !== '0' ? trimsTna : '05-Sep-2026',
    delayDays2: parseInt(delayDays2, 10) || 0,
    cd: cd || '',
    requireDays: parseInt(requireDays, 10) || Math.ceil(orderQty / (dailyTarget || 1000)),
    unitPrice: 3.25,
    totalValue: Number((orderQty * 3.25).toFixed(2)),
  };

  rows.push(row);
}

fs.writeFileSync(path.resolve('apps/web/data/sewing-line-plan-master.json'), JSON.stringify(rows, null, 2), 'utf8');
console.log(`Successfully parsed and enriched ${rows.length} rows into apps/web/data/sewing-line-plan-master.json`);
