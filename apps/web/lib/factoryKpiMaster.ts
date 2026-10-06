export type KpiMetricDefinition = {
  department: string;
  particular: string;
  unit: string;
  defaultTarget?: number;
  description?: string;
};

export const KPI_DEPARTMENTS = [
  'Production',
  'Cutting',
  'Quality',
  'Printing',
  'Knitting',
  'Dyeing',
  'Sample - Garment',
  'HR',
  'Pre-Production Handover',
  'Zero Defect',
  'Kaizen'
] as const;

export const KPI_METRICS_BY_DEPARTMENT: Record<string, KpiMetricDefinition[]> = {
  Production: [
    { department: 'Production', particular: 'Factory Sewing Production-Pcs', unit: 'Pcs', defaultTarget: 1600000 },
    { department: 'Production', particular: 'Factory Sewing Efficiency (%)', unit: '%', defaultTarget: 75.0 },
    { department: 'Production', particular: 'Average Sewing SMV', unit: 'SMV', defaultTarget: 9.5 },
    { department: 'Production', particular: 'Average MMR', unit: 'Ratio', defaultTarget: 2.6 },
    { department: 'Production', particular: 'Productivity / person / Hours-Pcs', unit: 'Pcs', defaultTarget: 5.0 },
    { department: 'Production', particular: 'Productivity / Machine / Day -Pcs', unit: 'Pcs', defaultTarget: 60.0 },
    { department: 'Production', particular: 'Sewing Capturing NPT %', unit: '%', defaultTarget: 80.0 },
    { department: 'Production', particular: 'Cut to Ship loss % (Garments)', unit: '%', defaultTarget: 2.5 },
    { department: 'Production', particular: 'Cut to ship loss % ( Overall )', unit: '%', defaultTarget: 5.0 }
  ],
  Cutting: [
    { department: 'Cutting', particular: 'Monthly production (Pcs) -2026', unit: 'Pcs', defaultTarget: 1500000 },
    { department: 'Cutting', particular: 'Monthly Efficiency-2026', unit: '%', defaultTarget: 82.0 },
    { department: 'Cutting', particular: 'Fabric wastage % on Cutting Closing Report', unit: '%', defaultTarget: 2.5 }
  ],
  Quality: [
    { department: 'Quality', particular: 'In Line DHU (Internal)', unit: 'DHU', defaultTarget: 8.0 },
    { department: 'Quality', particular: 'End Line Audit OQL', unit: '%', defaultTarget: 7.5 },
    { department: 'Quality', particular: 'End Line Sewing DHU', unit: 'DHU', defaultTarget: 3.0 },
    { department: 'Quality', particular: 'Pre-Final DHU', unit: 'DHU', defaultTarget: 4.0 },
    { department: 'Quality', particular: 'Final DHU', unit: 'DHU', defaultTarget: 5.0 },
    { department: 'Quality', particular: 'Stitching Feed Back DHU on Cutting', unit: 'DHU', defaultTarget: 2.5 },
    { department: 'Quality', particular: 'Number Of Style Check (FRI)', unit: 'Styles', defaultTarget: 400 },
    { department: 'Quality', particular: 'Number Of Style Re-Check', unit: 'Styles', defaultTarget: 4 }
  ],
  Printing: [
    { department: 'Printing', particular: 'Printing Production(Panel-Pcs)', unit: 'Pcs', defaultTarget: 900000 },
    { department: 'Printing', particular: 'Printing Production(Gmts-Pcs)', unit: 'Pcs', defaultTarget: 550000 },
    { department: 'Printing', particular: 'Efficiency', unit: '%', defaultTarget: 92.0 },
    { department: 'Printing', particular: 'Total Lost Time', unit: '%', defaultTarget: 8.0 },
    { department: 'Printing', particular: 'Capturing Lost time', unit: '%', defaultTarget: 85.0 },
    { department: 'Printing', particular: 'Defective % (Panel Inspected)', unit: '%', defaultTarget: 0.6 }
  ],
  Knitting: [
    { department: 'Knitting', particular: 'Production- kg', unit: 'kg', defaultTarget: 220000 },
    { department: 'Knitting', particular: 'On Time Delivery Percentage (T&A)', unit: '%', defaultTarget: 80.0 },
    { department: 'Knitting', particular: 'Efficiency', unit: '%', defaultTarget: 80.0 }
  ],
  Dyeing: [
    { department: 'Dyeing', particular: 'Dyeing Production (kg)', unit: 'kg', defaultTarget: 300000 },
    { department: 'Dyeing', particular: 'Right First Time (R.F.T %)', unit: '%', defaultTarget: 75.0 },
    { department: 'Dyeing', particular: 'Average Load Percentage', unit: '%', defaultTarget: 70.0 },
    { department: 'Dyeing', particular: 'On Time Delivery Percentage (T&A)', unit: '%', defaultTarget: 40.0 }
  ],
  'Sample - Garment': [
    { department: 'Sample - Garment', particular: 'Sample Production (Pcs)', unit: 'Pcs', defaultTarget: 16000 },
    { department: 'Sample - Garment', particular: 'Sample Rejection Percentage', unit: '%', defaultTarget: 0.5 },
    { department: 'Sample - Garment', particular: 'Productivity / person / Hours (Pcs)', unit: 'Pcs', defaultTarget: 1.5 },
    { department: 'Sample - Garment', particular: 'On Time Delivery Percentage', unit: '%', defaultTarget: 60.0 },
    { department: 'Sample - Garment', particular: 'Actual Working Hours / Day', unit: 'Hours', defaultTarget: 9.0 }
  ],
  HR: [
    { department: 'HR', particular: 'Worker Absenteeism Rate', unit: '%', defaultTarget: 5.0 },
    { department: 'HR', particular: 'Worker Migration Rate', unit: '%', defaultTarget: 2.0 },
    { department: 'HR', particular: 'Worker Happiness Index', unit: '%', defaultTarget: 75.0 }
  ],
  'Pre-Production Handover': [
    { department: 'Pre-Production Handover', particular: 'Delighted', unit: '%', defaultTarget: 60.0 },
    { department: 'Pre-Production Handover', particular: 'Satisfied', unit: '%', defaultTarget: 25.0 },
    { department: 'Pre-Production Handover', particular: 'Not Satisfied', unit: '%', defaultTarget: 15.0 }
  ],
  'Zero Defect': [
    { department: 'Zero Defect', particular: 'Operators (Person)', unit: 'Person', defaultTarget: 50 },
    { department: 'Zero Defect', particular: 'Quality Inspectors (Person)', unit: 'Person', defaultTarget: 8 }
  ],
  Kaizen: [
    { department: 'Kaizen', particular: 'No. of Kaizen Project - NFL', unit: 'Projects', defaultTarget: 40 }
  ]
};

export const MONTH_OPTIONS = [
  { key: 'jan', label: 'Jan-26', monthNum: 1 },
  { key: 'feb', label: 'Feb-26', monthNum: 2 },
  { key: 'mar', label: 'Mar-26', monthNum: 3 },
  { key: 'apr', label: 'Apr-26', monthNum: 4 },
  { key: 'may', label: 'May-26', monthNum: 5 },
  { key: 'jun', label: 'Jun-26', monthNum: 6 },
  { key: 'jul', label: 'Jul-26', monthNum: 7 },
  { key: 'aug', label: 'Aug-26', monthNum: 8 },
  { key: 'sep', label: 'Sep-26', monthNum: 9 },
  { key: 'oct', label: 'Oct-26', monthNum: 10 },
  { key: 'nov', label: 'Nov-26', monthNum: 11 },
  { key: 'dec', label: 'Dec-26', monthNum: 12 }
];
