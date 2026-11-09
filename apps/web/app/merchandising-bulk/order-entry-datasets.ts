/**
 * Real Buyer Order Entry Datasets
 * Includes extracted production data from 76-page Bestseller Purchase Order PDF
 * Style No: 15323159 (ONLRILEY O-NECK L/S TOP JRS NOOS)
 * Total: 49,292 pcs across 14 purchase orders and 7 chronological delivery dates (CCDs).
 */

export interface Colorway {
  name: string;
  code?: string;
}

export interface PoRow {
  id: string;
  ref: string; // PO Number or Country/Market
  type: 'PO' | 'MARKET';
  ccd: string; // Target Shipment / Cargo Closing Date (YYYY-MM-DD)
  cancelDate: string;
  dest: string; // Destination Country / Market
  shipMode: string;
  selected: boolean; // Checked for cutting batch!
  isExpanded: boolean;
  quantities: number[][]; // quantities[colorIndex][sizeIndex]
}

export interface FabricSpecPart {
  id: string;
  part: string;
  fabric: string;
  gsm: string | number;
  comp: string;
}

export interface OrderEntryDataset {
  buyer: string;
  brand: string;
  style: string;
  styleName: string;
  item: string;
  fob: string;
  currency: string;
  tolerance: string;
  packType: string;
  washType: string;
  ccd: string;
  poDate: string;
  cancelDate: string;
  shipMode: string;
  fabricParts: FabricSpecPart[];
  sizePresetKey: string;
  sizeHeaders: string[];
  colorways: Colorway[];
  poList: PoRow[];
}

export const BESTSELLER_15323159_DATA: OrderEntryDataset = {
  buyer: 'ONLY',
  brand: 'ONL-JRSY',
  style: '15323159',
  styleName: 'ONLRILEY O-NECK L/S TOP JRS NOOS',
  item: 'T-Shirt',
  fob: '2.90',
  currency: 'USD',
  tolerance: '5% (+/-)',
  packType: 'Single Flat Pack',
  washType: 'Normal Silicon Softner Wash',
  ccd: '2026-09-21',
  poDate: '2026-08-13',
  cancelDate: '2026-10-05',
  shipMode: 'Sea Freight',
  fabricParts: [
    {
      id: 'part-1',
      part: 'Body Fabric',
      fabric: '1x1 RIB - 230 GSM',
      gsm: '230',
      comp: '96% Cotton Organic Direct to Farm, 4% Elastane'
    },
    {
      id: 'part-2',
      part: 'Melange Parts (LGM)',
      fabric: '1x1 RIB Melange',
      gsm: '230',
      comp: '91% Cotton, 5% Viscose, 4% Elastane'
    },
    {
      id: 'part-3',
      part: 'Neck Rib / Binding',
      fabric: '1x1 Rib Binding (Self-Fabric)',
      gsm: '230',
      comp: '96% Cotton Organic, 4% Elastane'
    }
  ],
  sizePresetKey: 'ALPHA',
  sizeHeaders: ["XS","S","M","L","XL","XXL","XXXL"],
  colorways: [
  {
    "name": "Balsam Green",
    "code": "18-5606 TCX"
  },
  {
    "name": "Bitter Chocolate",
    "code": "19-1317 TCX"
  },
  {
    "name": "Black",
    "code": "19-4008 TCX"
  },
  {
    "name": "Black Coffee",
    "code": "19-1111 TCX"
  },
  {
    "name": "Cloud Dancer",
    "code": "11-4201 TCX"
  },
  {
    "name": "Cornflower Blue",
    "code": "16-4031 TCX"
  },
  {
    "name": "Dusk",
    "code": "15-4305 TCX"
  },
  {
    "name": "Flint Stone",
    "code": "18-4016 TCX"
  },
  {
    "name": "Italian Straw",
    "code": "13-0917 TCX"
  },
  {
    "name": "Light Grey Melange",
    "code": "BS000086"
  },
  {
    "name": "Mauve Mist",
    "code": "15-3207 TCX"
  },
  {
    "name": "Pumice Stone",
    "code": "14-0002 TCX"
  },
  {
    "name": "Sweet Dreams",
    "code": "13-2809 TCX"
  },
  {
    "name": "Wild Orchid",
    "code": "16-2120 TCX"
  }
],
  poList: [
  {
    "id": "po-1",
    "ref": "NOF4754936",
    "type": "PO",
    "ccd": "2026-09-21",
    "cancelDate": "2026-10-05",
    "dest": "Panama (PA)",
    "shipMode": "Sea Freight",
    "selected": true,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        38,
        76,
        114,
        76,
        38,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-2",
    "ref": "NOF4760215",
    "type": "PO",
    "ccd": "2026-09-21",
    "cancelDate": "2026-10-05",
    "dest": "Panama (PA)",
    "shipMode": "Sea Freight",
    "selected": true,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        38,
        76,
        114,
        76,
        38,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        24,
        48,
        72,
        48,
        24,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-3",
    "ref": "NOF4760225",
    "type": "PO",
    "ccd": "2026-10-06",
    "cancelDate": "2026-10-20",
    "dest": "Uruguay (UY)",
    "shipMode": "Sea Freight",
    "selected": true,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        12,
        24,
        36,
        24,
        12,
        0,
        0
      ],
      [
        52,
        104,
        156,
        104,
        52,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        48,
        96,
        144,
        96,
        48,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        6,
        12,
        18,
        12,
        6,
        0,
        0
      ],
      [
        12,
        24,
        36,
        24,
        12,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-4",
    "ref": "NOF4764277",
    "type": "PO",
    "ccd": "2026-10-14",
    "cancelDate": "2026-10-28",
    "dest": "Netherlands (NL)",
    "shipMode": "Sea Freight",
    "selected": true,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        640,
        1200,
        1440,
        800,
        960,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-5",
    "ref": "NOF4764278",
    "type": "PO",
    "ccd": "2026-10-21",
    "cancelDate": "2026-11-04",
    "dest": "Netherlands (NL)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        640,
        1200,
        1440,
        1120,
        640,
        0,
        0
      ],
      [
        400,
        720,
        960,
        640,
        320,
        0,
        0
      ],
      [
        640,
        1280,
        1520,
        1040,
        560,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-6",
    "ref": "NOF4754793",
    "type": "PO",
    "ccd": "2026-10-28",
    "cancelDate": "2026-11-11",
    "dest": "Denmark (DK)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        99,
        264,
        396,
        297,
        165,
        33,
        33
      ],
      [
        62,
        144,
        206,
        144,
        82,
        20,
        20
      ],
      [
        52,
        118,
        170,
        118,
        66,
        14,
        14
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        70,
        163,
        233,
        163,
        93,
        23,
        23
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        62,
        144,
        206,
        144,
        82,
        20,
        20
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        46,
        115,
        161,
        115,
        69,
        23,
        23
      ],
      [
        34,
        75,
        109,
        75,
        41,
        7,
        7
      ],
      [
        66,
        165,
        231,
        165,
        99,
        33,
        33
      ],
      [
        99,
        264,
        396,
        297,
        165,
        33,
        33
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        82,
        205,
        287,
        205,
        123,
        41,
        41
      ]
    ]
  },
  {
    "id": "po-7",
    "ref": "NOF4754794",
    "type": "PO",
    "ccd": "2026-10-28",
    "cancelDate": "2026-11-11",
    "dest": "Denmark (DK)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        18,
        36,
        54,
        36,
        18,
        0,
        0
      ],
      [
        78,
        156,
        234,
        156,
        78,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        102,
        204,
        306,
        204,
        102,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        12,
        24,
        36,
        24,
        12,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        16,
        32,
        48,
        32,
        16,
        0,
        0
      ],
      [
        26,
        52,
        78,
        52,
        26,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-8",
    "ref": "NOF4754796",
    "type": "PO",
    "ccd": "2026-10-28",
    "cancelDate": "2026-11-11",
    "dest": "Denmark (DK)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        6,
        12,
        18,
        12,
        6,
        0,
        0
      ],
      [
        14,
        28,
        42,
        28,
        14,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        14,
        28,
        42,
        28,
        14,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        4,
        8,
        12,
        8,
        4,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        6,
        4,
        2,
        0,
        0
      ],
      [
        6,
        12,
        18,
        12,
        6,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-9",
    "ref": "NOF4754999",
    "type": "PO",
    "ccd": "2026-10-28",
    "cancelDate": "2026-11-11",
    "dest": "Denmark (DK)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        30,
        60,
        90,
        60,
        30,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        30,
        60,
        90,
        60,
        30,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-10",
    "ref": "NOF4764279",
    "type": "PO",
    "ccd": "2026-10-28",
    "cancelDate": "2026-11-11",
    "dest": "Netherlands (NL)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        400,
        720,
        960,
        560,
        400,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        640,
        1280,
        1600,
        960,
        560,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-11",
    "ref": "NOF4754678",
    "type": "PO",
    "ccd": "2026-11-02",
    "cancelDate": "2026-11-16",
    "dest": "Canada (CA)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-12",
    "ref": "NOF4754702",
    "type": "PO",
    "ccd": "2026-11-02",
    "cancelDate": "2026-11-16",
    "dest": "Canada (CA)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-13",
    "ref": "NOF4755059",
    "type": "PO",
    "ccd": "2026-11-02",
    "cancelDate": "2026-11-16",
    "dest": "Canada (CA)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        4,
        4,
        4,
        2,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  },
  {
    "id": "po-14",
    "ref": "NOF4754795",
    "type": "PO",
    "ccd": "2026-11-18",
    "cancelDate": "2026-12-02",
    "dest": "Denmark (DK)",
    "shipMode": "Sea Freight",
    "selected": false,
    "isExpanded": false,
    "quantities": [
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        361,
        722,
        722,
        722,
        361,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        57,
        114,
        171,
        114,
        57,
        0,
        0
      ],
      [
        361,
        722,
        722,
        722,
        361,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        418,
        836,
        893,
        836,
        418,
        0,
        0
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ]
    ]
  }
]
};

export const OVS_SAMPLE_DATA: OrderEntryDataset = {
  buyer: 'OVS',
  brand: 'OVS-CASUAL',
  style: 'OVS-2026-T91',
  styleName: 'MEN SHORT SLEEVE PIQUE POLO',
  item: 'Polo Shirt',
  fob: '3.80',
  currency: 'USD',
  tolerance: '5% (+/-)',
  packType: 'Single Flat Pack',
  washType: 'Enzyme Silicone Softner Wash',
  ccd: '2026-10-15',
  poDate: '2026-08-20',
  cancelDate: '2026-10-30',
  shipMode: 'Sea Freight',
  fabricParts: [
    { id: 'part-ovs-1', part: 'Body Fabric', fabric: '100% Cotton Pique', gsm: '210', comp: '100% BCI Cotton' },
    { id: 'part-ovs-2', part: 'Flat Knit Collar', fabric: '1x1 Flat Knit Collar', gsm: '450', comp: '100% Cotton' },
    { id: 'part-ovs-3', part: 'Cuff Rib', fabric: '1x1 Flat Knit Cuff', gsm: '450', comp: '100% Cotton' }
  ],
  sizePresetKey: 'NUMERIC_WAIST',
  sizeHeaders: ['28', '30', '32', '34', '36', '38'],
  colorways: [
    { name: 'Navy Blue', code: '19-4015 TCX' },
    { name: 'Optical White', code: '11-0601 TCX' },
    { name: 'Melange Grey', code: '14-4102 TCX' }
  ],
  poList: [
    {
      id: 'ovs-mkt-1',
      ref: 'Italy (Domestic)',
      type: 'MARKET',
      ccd: '2026-10-15',
      cancelDate: '2026-10-30',
      dest: 'Italy Central WHS',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [150, 400, 800, 700, 350, 200],
        [120, 300, 600, 500, 250, 130],
        [80, 200, 400, 350, 180, 90]
      ]
    },
    {
      id: 'ovs-mkt-2',
      ref: 'Middle East (Dubai Hub)',
      type: 'MARKET',
      ccd: '2026-10-15',
      cancelDate: '2026-10-30',
      dest: 'Dubai Logistics Freezone',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [100, 250, 500, 450, 220, 130],
        [80, 180, 350, 320, 170, 100],
        [60, 120, 250, 220, 110, 60]
      ]
    },
    {
      id: 'ovs-mkt-3',
      ref: 'Spain & Portugal',
      type: 'MARKET',
      ccd: '2026-10-28',
      cancelDate: '2026-11-12',
      dest: 'Madrid Distribution Hub',
      shipMode: 'Sea Freight',
      selected: false,
      isExpanded: false,
      quantities: [
        [90, 220, 440, 380, 190, 110],
        [70, 160, 320, 280, 140, 80],
        [50, 110, 220, 190, 100, 50]
      ]
    }
  ]
};

export const NAME_IT_SAMPLE_DATA: OrderEntryDataset = {
  buyer: 'Name It',
  brand: 'NMT-KIDS',
  style: 'NMT-78420-TEE',
  styleName: 'KIDS ORGANIC COTTON PRINTED TEE',
  item: 'Kids T-Shirt',
  fob: '2.45',
  currency: 'USD',
  tolerance: '5% (+/-)',
  packType: 'Single Flat Pack',
  washType: 'Normal Silicon Softner Wash',
  ccd: '2026-10-20',
  poDate: '2026-08-25',
  cancelDate: '2026-11-05',
  shipMode: 'Sea Freight',
  fabricParts: [
    { id: 'part-nmt-1', part: 'Body Fabric', fabric: '100% Organic Cotton Single Jersey', gsm: '150', comp: '100% Organic Cotton' },
    { id: 'part-nmt-2', part: 'Neck Rib', fabric: '1x1 Cotton Lycra Rib', gsm: '210', comp: '95% Organic Cotton 5% Elastane' }
  ],
  sizePresetKey: 'KIDS',
  sizeHeaders: ['92', '98', '104', '110', '116', '122', '128'],
  colorways: [
    { name: 'Buttercup Yellow', code: '12-0752 TCX' },
    { name: 'Sky Blue', code: '14-4115 TCX' },
    { name: 'Marshmallow White', code: '11-4300 TCX' }
  ],
  poList: [
    {
      id: 'nmt-po-1',
      ref: 'NMT-PO-44810',
      type: 'PO',
      ccd: '2026-10-20',
      cancelDate: '2026-11-05',
      dest: 'Denmark Central WHS',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [200, 350, 600, 550, 400, 250, 150],
        [150, 300, 500, 450, 350, 200, 100],
        [120, 250, 450, 400, 300, 180, 80]
      ]
    },
    {
      id: 'nmt-po-2',
      ref: 'NMT-PO-44811',
      type: 'PO',
      ccd: '2026-11-05',
      cancelDate: '2026-11-20',
      dest: 'Germany Hub',
      shipMode: 'Sea Freight',
      selected: false,
      isExpanded: false,
      quantities: [
        [180, 300, 520, 480, 350, 220, 120],
        [140, 260, 440, 400, 300, 180, 90],
        [100, 220, 380, 340, 250, 150, 70]
      ]
    }
  ]
};
