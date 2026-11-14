// Northern Fashions Limited ERP - Finished Fabric Received & Issue Statement
// Exact Reconciled Data from Excel Report as of 14.11.26

export interface WorkingStockBuyerRow {
  buyer: string;
  month: 'September' | 'October' | 'November' | 'December';
  recvBody: number;
  recvRib: number;
  recvSJ: number;
  issueBody: number;
  issueRib: number;
  issueSJ: number;
  stockBody: number;
  stockRib: number;
  stockSJ: number;
}

export interface WorkingStockMonthGroup {
  month: 'September' | 'October' | 'November' | 'December';
  rows: WorkingStockBuyerRow[];
  subtotal: {
    recvBody: number;
    recvRib: number;
    recvSJ: number;
    totalRecv: number;
    issueBody: number;
    issueRib: number;
    issueSJ: number;
    totalIssue: number;
    stockBody: number;
    stockRib: number;
    stockSJ: number;
    totalStock: number;
  };
}

export const WORKING_STOCK_STATEMENT: WorkingStockMonthGroup[] = [
  {
    month: 'September',
    rows: [
      { buyer: 'Bestseller (Only & Sonse)', month: 'September', recvBody: 89672, recvRib: 11473, recvSJ: 0, issueBody: 89127, issueRib: 11275, issueSJ: 0, stockBody: 545, stockRib: 198, stockSJ: 0 },
      { buyer: 'Bestseller (ONLY)', month: 'September', recvBody: 132770, recvRib: 11300, recvSJ: 0, issueBody: 130307, issueRib: 11058, issueSJ: 0, stockBody: 2463, stockRib: 242, stockSJ: 0 },
      { buyer: 'Besrseller (Name It)', month: 'September', recvBody: 44894, recvRib: 7257, recvSJ: 0, issueBody: 44012, issueRib: 7108, issueSJ: 0, stockBody: 882, stockRib: 149, stockSJ: 0 },
      { buyer: 'GBX Trading (Maurices)', month: 'September', recvBody: 4751, recvRib: 0, recvSJ: 0, issueBody: 4750, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'United Textile (UTG)', month: 'September', recvBody: 25952, recvRib: 119, recvSJ: 0, issueBody: 25643, issueRib: 119, issueSJ: 0, stockBody: 309, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX Assos miss-selfridge', month: 'September', recvBody: 174, recvRib: 0, recvSJ: 0, issueBody: 173, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX Trading (New Look)', month: 'September', recvBody: 28586, recvRib: 1462, recvSJ: 0, issueBody: 28585, issueRib: 1452, issueSJ: 0, stockBody: 1, stockRib: 10, stockSJ: 0 },
      { buyer: "GBX- Sainsburry's", month: 'September', recvBody: 1, recvRib: 0, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'OVS SPA', month: 'September', recvBody: 117801, recvRib: 4901, recvSJ: 0, issueBody: 116421, issueRib: 4877, issueSJ: 0, stockBody: 1380, stockRib: 24, stockSJ: 0 },
      { buyer: "GBX- ANTHONY'S", month: 'September', recvBody: 1325, recvRib: 85, recvSJ: 0, issueBody: 1324, issueRib: 85, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX- T.M Lewin', month: 'September', recvBody: 1, recvRib: 0, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
    ],
    subtotal: {
      recvBody: 445927,
      recvRib: 36597,
      recvSJ: 0,
      totalRecv: 482524,
      issueBody: 440342,
      issueRib: 35974,
      issueSJ: 0,
      totalIssue: 476316,
      stockBody: 5585,
      stockRib: 623,
      stockSJ: 0,
      totalStock: 6208,
    },
  },
  {
    month: 'October',
    rows: [
      { buyer: 'Bestseller (Only & Sonse)', month: 'October', recvBody: 46542, recvRib: 7846, recvSJ: 0, issueBody: 43702, issueRib: 7200, issueSJ: 0, stockBody: 2840, stockRib: 646, stockSJ: 0 },
      { buyer: 'Bestseller (ONLY)', month: 'October', recvBody: 228303, recvRib: 12688, recvSJ: 0, issueBody: 195256, issueRib: 11152, issueSJ: 0, stockBody: 33047, stockRib: 1536, stockSJ: 0 },
      { buyer: 'Besrseller (Name It)', month: 'October', recvBody: 3776, recvRib: 509, recvSJ: 0, issueBody: 3075, issueRib: 394, issueSJ: 0, stockBody: 701, stockRib: 115, stockSJ: 0 },
      { buyer: 'GBX Trading (Maurices)', month: 'October', recvBody: 2810, recvRib: 0, recvSJ: 0, issueBody: 2781, issueRib: 0, issueSJ: 0, stockBody: 29, stockRib: 0, stockSJ: 0 },
      { buyer: 'United Textile (UTG)', month: 'October', recvBody: 61368, recvRib: 291, recvSJ: 0, issueBody: 60132, issueRib: 256, issueSJ: 0, stockBody: 1236, stockRib: 35, stockSJ: 0 },
      { buyer: 'GBX Assos miss-selfridge', month: 'October', recvBody: 1, recvRib: 0, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX Trading (New Look)', month: 'October', recvBody: 24683, recvRib: 899, recvSJ: 0, issueBody: 24150, issueRib: 584, issueSJ: 0, stockBody: 533, stockRib: 315, stockSJ: 0 },
      { buyer: "GBX- Sainsburry's", month: 'October', recvBody: 1, recvRib: 0, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'OVS SPA', month: 'October', recvBody: 124295, recvRib: 6192, recvSJ: 0, issueBody: 119721, issueRib: 6005, issueSJ: 0, stockBody: 4574, stockRib: 187, stockSJ: 0 },
      { buyer: 'GBX-Guess', month: 'October', recvBody: 1, recvRib: 0, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX- T.M Lewin', month: 'October', recvBody: 9368, recvRib: 276, recvSJ: 0, issueBody: 9367, issueRib: 276, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
    ],
    subtotal: {
      recvBody: 501148,
      recvRib: 28701,
      recvSJ: 0,
      totalRecv: 529849,
      issueBody: 458184,
      issueRib: 25867,
      issueSJ: 0,
      totalIssue: 484051,
      stockBody: 42964,
      stockRib: 2834,
      stockSJ: 0,
      totalStock: 45798,
    },
  },
  {
    month: 'November',
    rows: [
      { buyer: 'Bestseller (Only & Sonse)', month: 'November', recvBody: 99359, recvRib: 7082, recvSJ: 0, issueBody: 72440, issueRib: 5305, issueSJ: 0, stockBody: 26919, stockRib: 1777, stockSJ: 0 },
      { buyer: 'Bestseller (ONLY)', month: 'November', recvBody: 214714, recvRib: 8606, recvSJ: 0, issueBody: 176268, issueRib: 6438, issueSJ: 0, stockBody: 38446, stockRib: 2168, stockSJ: 0 },
      { buyer: 'Besrseller (Name It)', month: 'November', recvBody: 94098, recvRib: 9339, recvSJ: 0, issueBody: 61632, issueRib: 7717, issueSJ: 0, stockBody: 32466, stockRib: 1622, stockSJ: 0 },
      { buyer: 'United Textile (UTG)', month: 'November', recvBody: 18774, recvRib: 0, recvSJ: 0, issueBody: 2280, issueRib: 0, issueSJ: 0, stockBody: 16494, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX Assos miss-selfridge', month: 'November', recvBody: 6089, recvRib: 37, recvSJ: 0, issueBody: 5876, issueRib: 37, issueSJ: 0, stockBody: 213, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX Trading (New Look)', month: 'November', recvBody: 16445, recvRib: 66, recvSJ: 0, issueBody: 5175, issueRib: 46, issueSJ: 0, stockBody: 11270, stockRib: 20, stockSJ: 0 },
      { buyer: "GBX- Sainsburry's", month: 'November', recvBody: 3031, recvRib: 167, recvSJ: 0, issueBody: 2997, issueRib: 39, issueSJ: 0, stockBody: 34, stockRib: 128, stockSJ: 0 },
      { buyer: 'OVS SPA', month: 'November', recvBody: 108139, recvRib: 3858, recvSJ: 0, issueBody: 69830, issueRib: 2521, issueSJ: 0, stockBody: 38309, stockRib: 1337, stockSJ: 0 },
      { buyer: 'GBX Trading (Maurices)', month: 'November', recvBody: 5725, recvRib: 124, recvSJ: 0, issueBody: 4657, issueRib: 124, issueSJ: 0, stockBody: 1068, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX- T.M Lewin', month: 'November', recvBody: 10166, recvRib: 289, recvSJ: 0, issueBody: 9524, issueRib: 260, issueSJ: 0, stockBody: 642, stockRib: 29, stockSJ: 0 },
    ],
    subtotal: {
      recvBody: 576540,
      recvRib: 29568,
      recvSJ: 0,
      totalRecv: 606108,
      issueBody: 410679,
      issueRib: 22487,
      issueSJ: 0,
      totalIssue: 433166,
      stockBody: 165861,
      stockRib: 7081,
      stockSJ: 0,
      totalStock: 172942,
    },
  },
  {
    month: 'December',
    rows: [
      { buyer: 'Bestseller (Only & Sonse)', month: 'December', recvBody: 16955, recvRib: 927, recvSJ: 0, issueBody: 2267, issueRib: 272, issueSJ: 0, stockBody: 14688, stockRib: 655, stockSJ: 0 },
      { buyer: 'Bestseller (ONLY)', month: 'December', recvBody: 47756, recvRib: 1137, recvSJ: 0, issueBody: 7312, issueRib: 236, issueSJ: 0, stockBody: 40444, stockRib: 901, stockSJ: 0 },
      { buyer: 'Besrseller (Name It)', month: 'December', recvBody: 7408, recvRib: 1262, recvSJ: 0, issueBody: 866, issueRib: 0, issueSJ: 0, stockBody: 6542, stockRib: 1262, stockSJ: 0 },
      { buyer: 'United Textile (UTG)', month: 'December', recvBody: 9610, recvRib: 0, recvSJ: 0, issueBody: 6756, issueRib: 0, issueSJ: 0, stockBody: 2854, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX Assos miss-selfridge', month: 'December', recvBody: 1, recvRib: 0, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX Trading (New Look)', month: 'December', recvBody: 1915, recvRib: 84, recvSJ: 0, issueBody: 1390, issueRib: 0, issueSJ: 0, stockBody: 525, stockRib: 84, stockSJ: 0 },
      { buyer: "GBX- Sainsburry's", month: 'December', recvBody: 1, recvRib: 0, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'OVS SPA', month: 'December', recvBody: 14330, recvRib: 328, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 14330, stockRib: 328, stockSJ: 0 },
      { buyer: 'GBX Trading (Maurices)', month: 'December', recvBody: 1, recvRib: 0, recvSJ: 0, issueBody: 0, issueRib: 0, issueSJ: 0, stockBody: 1, stockRib: 0, stockSJ: 0 },
      { buyer: 'GBX- T.M Lewin', month: 'December', recvBody: 8580, recvRib: 193, recvSJ: 0, issueBody: 6185, issueRib: 155, issueSJ: 0, stockBody: 2395, stockRib: 38, stockSJ: 0 },
    ],
    subtotal: {
      recvBody: 106557,
      recvRib: 3931,
      recvSJ: 0,
      totalRecv: 110488,
      issueBody: 24776,
      issueRib: 663,
      issueSJ: 0,
      totalIssue: 25439,
      stockBody: 81781,
      stockRib: 3268,
      stockSJ: 0,
      totalStock: 85049,
    },
  },
];

export const WORKING_STOCK_GRAND_TOTAL = {
  recvBody: 2941205,
  recvRib: 227136,
  recvSJ: 0,
  totalRecv: 3168341,

  issueBody: 2622770,
  issueRib: 209535,
  issueSJ: 0,
  totalIssue: 2832305,

  stockBody: 318435,
  stockRib: 17601,
  stockSJ: 0,
  totalStock: 336036,
};
