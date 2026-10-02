const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../demo-import/NFL_Pulse_ERP_2000_Job_Realistic_Demo_Aug-Nov_2026.xlsx');
console.log('Reading:', filePath);

const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets['ERP_MASTER_IMPORT'];
const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

console.log(`Loaded ${rawRows.length} raw rows from ERP_MASTER_IMPORT`);

const jobs = rawRows.map((r, idx) => {
  const jobNo = String(r.Job_No || '').trim();
  const buyer = String(r.Buyer || '').trim();
  const buyerRaw = String(r.Buyer_Raw || buyer).trim();
  const styleNo = String(r.Style_No || '').trim();
  const orderQty = Number(r.Order_Qty_Pcs) || 0;
  const item = String(r.Item || '').trim();
  const itemDescription = String(r.Item_Description || '').trim();
  const merchandiser = String(r.Merchandiser || '').trim();
  const presentStatus = String(r.Present_Status || 'Confirmed').trim();
  const overallStage = String(r.Overall_Stage || 'Production').trim();
  const riskStatus = String(r.Risk_Status || 'ON_TRACK').trim();
  const dataQuality = String(r.Data_Quality || '').trim();
  const planMonth = String(r.Plan_Month || '').trim();

  // Fabric & Yarn
  const fabricType = String(r.Fabric_Type || '').trim();
  const gsm = String(r.GSM || '').trim();
  const widthDia = String(r.Width_Dia || '').trim();
  const colors = String(r.Colors || '').trim();
  const colorCount = Number(r.Color_Count) || 1;
  const fabricReqKg = Number(r.Fabric_Req_Kg) || 0;
  const fabricReceivedKg = Number(r.Fabric_Received_Kg) || 0;
  const fabricBalanceKg = Number(r.Fabric_Balance_Kg) || 0;
  const additionalProcess = String(r.Additional_Process || '').trim();
  const dyeingFactory = String(r.Dyeing_Factory || 'NFL').trim();
  const dyeBatchNo = String(r.Dye_Batch_No || '').trim();

  const yarnReqKg = Number(r.Yarn_Req_Kg) || 0;
  const yarnReceivedKg = Number(r.Yarn_Received_Kg) || 0;
  const yarnIssuedKg = Number(r.Yarn_Issued_Kg) || 0;
  const yarnBalanceKg = Number(r.Yarn_Balance_Kg) || 0;
  const yarnLotNo = String(r.Yarn_Lot_No || '').trim();
  const yarnStoreStatus = String(r.Yarn_Store_Status || 'READY').trim();

  const greyReqKg = Number(r.Grey_Req_Kg) || 0;
  const greyProducedKg = Number(r.Grey_Produced_Kg) || 0;
  const greyBalanceKg = Number(r.Grey_Balance_Kg) || 0;
  const knittingStatus = String(r.Knitting_Status || 'READY').trim();

  // Execution
  const cuttingQty = Number(r.Cutting_Qty) || 0;
  const cuttingBalance = Number(r.Cutting_Balance) || 0;
  const cuttingStatus = String(r.Cutting_Status || 'READY').trim();

  const printEmbType = String(r.Print_Emb_Type || 'None').trim();
  const printEmbReqQty = Number(r.Print_Emb_Req_Qty) || 0;
  const printEmbSendQty = Number(r.Print_Emb_Send_Qty) || 0;
  const printEmbRecvQty = Number(r.Print_Emb_Recv_Qty) || 0;
  const printEmbStatus = String(r.Print_Emb_Status || 'N/A').trim();

  const inputQty = Number(r.Sewing_Input_Qty) || 0;
  const inputBalance = Number(r.Input_Balance) || 0;
  const inputStatus = String(r.Input_Status || 'READY').trim();

  // IE & Sewing Line
  const smv = Number(r.IE_SMV) || 0;
  const machineQty = Number(r.IE_Machine_Qty) || 0;
  const manpower = Number(r.IE_Manpower) || 0;
  const efficiencyPct = Number(r.IE_Efficiency_Pct) || 0;
  const dailyTarget = Number(r.IE_Daily_Target_Pcs) || 0;
  const targetPerHour = Number(r.IE_Target_Pcs_Per_Hour) || 0;

  const factory = String(r.Factory || 'NFL').trim();
  const floor = String(r.Floor || '').trim();
  const line = String(r.Primary_Line || '').trim();
  const secondaryLine = String(r.Secondary_Line || '').trim();
  const lineType = String(r.Line_Type || 'GENERAL').trim();
  const shiftMode = String(r.Shift_Mode || 'GENERAL').trim();

  const sewingActualQty = Number(r.Sewing_Actual_Qty) || 0;
  const sewingBalance = Number(r.Sewing_Balance) || 0;
  const achievementPct = Number(r.Sewing_Achievement_Pct) || 0;
  const sewingStatus = String(r.Sewing_Status || 'READY').trim();

  const finishingQty = Number(r.Finishing_Qty) || 0;
  const packingQty = Number(r.Packing_Qty) || 0;
  const inspectionStatus = String(r.Inspection_Status || 'PENDING').trim();

  const shipQty = Number(r.Ship_Qty) || 0;
  const shipBalance = Number(r.Ship_Balance) || 0;
  const shipmentStatus = String(r.Shipment_Status || 'SCHEDULED').trim();
  const exFactoryDate = String(r.Ex_Factory_Date || '').trim();
  const cargoClosingDate = String(r.Cargo_Closing_Date || '').trim();

  return {
    id: `JOB-${jobNo}-${idx + 1}`,
    recordId: r.Record_ID,
    jobNo,
    buyer,
    buyerRaw,
    buyerCode: buyer,
    styleNo,
    orderQty,
    item,
    itemDescription,
    merchandiser,
    presentStatus,
    overallStage,
    riskStatus,
    planMonth,
    dataQuality,
    // Fabric
    fabric: {
      fabricType,
      gsm,
      widthDia,
      colors,
      colorCount,
      fabricReqKg,
      fabricReceivedKg,
      fabricBalanceKg,
      additionalProcess,
      dyeingFactory,
      dyeBatchNo
    },
    // Yarn
    yarn: {
      yarnReqKg,
      yarnReceivedKg,
      yarnIssuedKg,
      yarnBalanceKg,
      yarnLotNo,
      status: yarnStoreStatus
    },
    // Knitting
    knitting: {
      greyReqKg,
      greyProducedKg,
      greyBalanceKg,
      status: knittingStatus
    },
    // Production
    cutting: {
      cuttingQty,
      cuttingBalance,
      status: cuttingStatus
    },
    printEmb: {
      type: printEmbType,
      reqQty: printEmbReqQty,
      sendQty: printEmbSendQty,
      recvQty: printEmbRecvQty,
      status: printEmbStatus
    },
    sewing: {
      readyForInput: Number(r.Ready_For_Input_Qty) || 0,
      inputQty,
      inputBalance,
      inputStatus,
      sewingActualQty,
      sewingBalance,
      achievementPct,
      status: sewingStatus
    },
    ie: {
      smv,
      machineQty,
      manpower,
      efficiencyPct,
      dailyTarget,
      targetPerHour,
      bulletinStatus: String(r.IE_Bulletin_Status || 'RELEASED').trim(),
      bulletinReleaseDate: String(r.IE_Bulletin_Release_Date || '').trim()
    },
    lineAllocation: {
      factory,
      floor,
      line,
      secondaryLine,
      lineType,
      shiftMode,
      hours: Number(r.Capacity_Hours) || 8,
      planStart: String(r.Line_Plan_Start || '').trim(),
      planEnd: String(r.Line_Plan_End || '').trim(),
      status: String(r.Line_Plan_Status || 'RELEASED').trim()
    },
    finishing: {
      finishingQty,
      packingQty,
      inspectionStatus
    },
    shipment: {
      shipQty,
      shipBalance,
      status: shipmentStatus,
      exFactoryDate,
      cargoClosingDate
    },
    dates: {
      poReceived: String(r.PO_Received_Date || '').trim(),
      tnaPlan: String(r.TNA_Plan_Date || '').trim(),
      cuttingStart: String(r.Cutting_Plan_Start || '').trim(),
      cuttingEnd: String(r.Cutting_Plan_End || '').trim(),
      sewingStart: String(r.Sewing_Plan_Start || '').trim(),
      sewingEnd: String(r.Sewing_Plan_End || '').trim(),
      exFactory: exFactoryDate,
      cargoClosing: cargoClosingDate
    },
    remarks: String(r.Remarks || '').trim()
  };
});

// Summary KPI counts
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

const outPayload = {
  version: '2.0.0',
  description: 'NFL Pulse ERP · 2,000 Job Realistic Demo Dataset (Aug-Nov 2026)',
  generatedAt: new Date().toISOString(),
  summary,
  jobs
};

const targetPath = path.join(__dirname, '../apps/web/data/demo-2000-master.json');
fs.writeFileSync(targetPath, JSON.stringify(outPayload, null, 2));

console.log('=== SUCCESS: COMPILED 2,000 JOBS MASTER DATA ===');
console.log('Target file:', targetPath);
console.log('Total jobs:', summary.totalJobs);
console.log('Total Order Qty (Pcs):', summary.totalQtyPcs.toLocaleString());
console.log('By Buyer:', summary.byBuyer);
console.log('By Month:', summary.byMonth);
console.log('By Factory:', summary.byFactory);
