/**
 * Real Buyer Order Entry Datasets
 * Includes extracted production data from factory-provided documents:
 * 1. Bestseller ONLY: Style 15323159 (ONLRILEY O-NECK L/S TOP JRS NOOS) - 49,292 pcs, 14 POs, $2.90 USD
 * 2. Bestseller NAME IT: Style 13214589 (NMKVIBE SS TOP NOOS) - Kids scale 92-128
 * 3. Bestseller ONLY & SONS: Style 22024810 (ONSPLYMOUTH CREW NECK SWEAT) - 16,800 pcs
 * 4. OVS S.p.A.: Style 271PJA416SP-903 (416PJA SHORT+ SCRITTA) - 43,366 pcs, 6 markets, $3.41 USD
 * 5. UTG Group: Style AF-SS26-D144-CK - 3PACK (Order BAD3016C / PO2404749C) - 2,000 pcs, $7.60 USD
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

// 1. BESTSELLER ONLY (From 76-page PO PDF)
export const BESTSELLER_ONLY_DATA: OrderEntryDataset = {
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

// 2. BESTSELLER ONLY & SONS
export const BESTSELLER_ONLY_AND_SONS_DATA: OrderEntryDataset = {
  buyer: 'Only & Sons',
  brand: 'ONS-DENIM',
  style: '22024810',
  styleName: 'ONSPLYMOUTH CREW NECK SWEAT',
  item: 'Sweatshirt',
  fob: '4.20',
  currency: 'USD',
  tolerance: '5% (+/-)',
  packType: 'Single Flat Pack',
  washType: 'Normal Silicon Softner Wash',
  ccd: '2026-10-15',
  poDate: '2026-08-18',
  cancelDate: '2026-10-30',
  shipMode: 'Sea Freight',
  fabricParts: [
    { id: 'ons-p1', part: 'Body Fabric', fabric: '100% Cotton French Terry 280 GSM', gsm: '280', comp: '100% BCI Cotton' },
    { id: 'ons-p2', part: 'Collar & Cuffs', fabric: '2x2 Cotton Lycra Rib 360 GSM', gsm: '360', comp: '95% Cotton 5% Spandex' }
  ],
  sizePresetKey: 'ALPHA',
  sizeHeaders: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  colorways: [
    { name: 'Dark Navy', code: '19-4024 TCX' },
    { name: 'Washed Olive', code: '18-0527 TCX' },
    { name: 'Light Grey Melange', code: 'BS000086' }
  ],
  poList: [
    {
      id: 'ons-po-1',
      ref: 'NOF4765101',
      type: 'PO',
      ccd: '2026-10-15',
      cancelDate: '2026-10-30',
      dest: 'Denmark Central WHS',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [300, 700, 1200, 1000, 600, 200],
        [250, 600, 1000, 850, 500, 150],
        [200, 500, 900, 750, 450, 150]
      ]
    },
    {
      id: 'ons-po-2',
      ref: 'NOF4765102',
      type: 'PO',
      ccd: '2026-10-28',
      cancelDate: '2026-11-12',
      dest: 'Germany Hub',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [250, 600, 1050, 900, 500, 200],
        [200, 500, 850, 750, 400, 150],
        [150, 400, 750, 650, 350, 100]
      ]
    }
  ]
};

// 3. BESTSELLER NAME IT
export const BESTSELLER_NAME_IT_DATA: OrderEntryDataset = {
  buyer: 'Name It',
  brand: 'NMT-KIDS',
  style: '13214589',
  styleName: 'NMKVIBE SS TOP NOOS',
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
      ref: 'NOF4758910',
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
      ref: 'NOF4758911',
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

// 4. OVS S.p.A. REAL PRODUCTION ORDER (From 17-page Technical Order Sheet)
export const OVS_REAL_DATA: OrderEntryDataset = {
  buyer: 'OVS',
  brand: 'OVS-NIGHTWEAR',
  style: '271PJA416SP-903',
  styleName: '416PJA SHORT+ SCRITTA (90 PYJAMAS)',
  item: 'Pyjamas Set',
  fob: '3.41',
  currency: 'USD',
  tolerance: '5% (+/-)',
  packType: 'Kit / Hanging & Flat In Store',
  washType: 'Normal Softner Wash',
  ccd: '2026-12-14',
  poDate: '2026-08-06',
  cancelDate: '2026-12-29',
  shipMode: 'Sea Freight',
  fabricParts: [
    {
      id: 'ovs-p1',
      part: 'Main Body Fabric',
      fabric: 'K0JRY00008 JERSEY 140',
      gsm: '140',
      comp: '100% Organic Cotton (GOTS certified)'
    },
    {
      id: 'ovs-p2',
      part: 'Collar Rib',
      fabric: 'K0RIB00482 RIB 1X1 160',
      gsm: '160',
      comp: '100% Cotton'
    }
  ],
  sizePresetKey: 'ALPHA',
  sizeHeaders: ['S', 'M', 'L', 'XL', 'XXL'],
  colorways: [
    { name: 'Lavender Lustre', code: '16-3920 TCX (2118)' },
    { name: 'Naval Academy', code: '19-3932 TCX (3439)' },
    { name: 'Flushing Pink', code: '13-2705 TCX (3694)' },
    { name: 'Pink Marshmellow', code: '12-2907 TCX (3131)' },
    { name: 'Bright White', code: '11-0601 TCX (1355)' }
  ],
  poList: [
    {
      id: 'ovs-mkt-1',
      ref: '1 OVS ITALY',
      type: 'MARKET',
      ccd: '2026-12-14',
      cancelDate: '2026-12-29',
      dest: 'Italy Central WHS (42,081 pcs)',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [2589, 2607, 1321, 1299, 1289],
        [2589, 2607, 1321, 1299, 1289],
        [2589, 2607, 1321, 1299, 1289],
        [2299, 2317, 1176, 1154, 1144],
        [1895, 1913, 974, 952, 942]
      ]
    },
    {
      id: 'ovs-mkt-2',
      ref: '2 OVS WARM',
      type: 'MARKET',
      ccd: '2026-12-14',
      cancelDate: '2026-12-29',
      dest: 'Southern Europe Warm Store',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [20, 20, 10, 10, 10],
        [46, 46, 23, 23, 23],
        [42, 42, 21, 21, 21],
        [14, 14, 7, 7, 7],
        [42, 42, 21, 21, 21]
      ]
    },
    {
      id: 'ovs-mkt-3',
      ref: '21 OVS INDIA',
      type: 'MARKET',
      ccd: '2026-12-14',
      cancelDate: '2026-12-29',
      dest: 'OVS India Store Hub',
      shipMode: 'Sea Freight',
      selected: false,
      isExpanded: false,
      quantities: [
        [4, 4, 2, 2, 2],
        [6, 6, 3, 3, 3],
        [6, 6, 3, 3, 3],
        [0, 0, 0, 0, 0],
        [6, 6, 3, 3, 3]
      ]
    },
    {
      id: 'ovs-mkt-4',
      ref: '24 OVS MIDDLE EAST',
      type: 'MARKET',
      ccd: '2026-12-14',
      cancelDate: '2026-12-29',
      dest: 'Middle East Regional Logistics',
      shipMode: 'Sea Freight',
      selected: false,
      isExpanded: false,
      quantities: [
        [12, 12, 6, 6, 6],
        [12, 12, 6, 6, 6],
        [12, 12, 6, 6, 6],
        [10, 10, 5, 5, 5],
        [12, 12, 6, 6, 6]
      ]
    },
    {
      id: 'ovs-mkt-5',
      ref: '25 OVS COLD',
      type: 'MARKET',
      ccd: '2026-12-14',
      cancelDate: '2026-12-29',
      dest: 'Northern Europe Cold Store',
      shipMode: 'Sea Freight',
      selected: false,
      isExpanded: false,
      quantities: [
        [16, 16, 8, 8, 8],
        [30, 30, 15, 15, 15],
        [30, 30, 15, 15, 15],
        [0, 0, 0, 0, 0],
        [30, 30, 15, 15, 15]
      ]
    },
    {
      id: 'ovs-mkt-6',
      ref: '26 REPL. HUB DUBAI',
      type: 'MARKET',
      ccd: '2026-12-14',
      cancelDate: '2026-12-29',
      dest: 'Dubai Logistics Freezone',
      shipMode: 'Sea Freight',
      selected: false,
      isExpanded: false,
      quantities: [
        [5, 6, 5, 4, 0],
        [5, 6, 5, 4, 0],
        [0, 0, 0, 0, 0],
        [5, 6, 5, 4, 0],
        [0, 0, 0, 0, 0]
      ]
    }
  ]
};

// 5. UTG GROUP REAL PRODUCTION CARD (From UTG Production Card No. 56467)
export const UTG_REAL_DATA: OrderEntryDataset = {
  buyer: 'UTG',
  brand: 'UTG-EUROPE',
  style: 'AF-SS26-D144-CK - 3PACK',
  styleName: 'Anna Field 3-Pack T-Shirt (Zalando)',
  item: 'T-Shirt (3-Pack)',
  fob: '7.60',
  currency: 'USD',
  tolerance: '5% (+/-)',
  packType: '3-Pack Polybag / Taffeta Label',
  washType: 'Normal Silicon Softner Wash',
  ccd: '2026-11-20',
  poDate: '2026-09-23',
  cancelDate: '2026-11-30',
  shipMode: 'Sea Freight',
  fabricParts: [
    {
      id: 'utg-p1',
      part: 'Body Fabric (Item 9760RA-YD)',
      fabric: '1x1 rib 95/5% regenagri cotton/elastan 240 g/m2 YD',
      gsm: '240',
      comp: '95% Regenagri Cotton, 5% Elastane'
    }
  ],
  sizePresetKey: 'ALPHA',
  sizeHeaders: ['XS', 'S', 'M', 'L', 'XL'],
  colorways: [
    { name: '1020/9000 White/black', code: '11-0601 TCX (AN621D1WM-Q11)' }
  ],
  poList: [
    {
      id: 'utg-po-1',
      ref: 'BAD3016C (Cust: PO2404749C)',
      type: 'PO',
      ccd: '2026-11-20',
      cancelDate: '2026-11-30',
      dest: 'Zalando Central Logistics (Germany)',
      shipMode: 'Sea Freight',
      selected: true,
      isExpanded: false,
      quantities: [
        [142, 449, 684, 472, 253]
      ]
    }
  ]
};

// Export active datasets map
export const BUYER_DATASETS: Record<string, OrderEntryDataset> = {
  'ONLY': BESTSELLER_ONLY_DATA,
  'Name It': BESTSELLER_NAME_IT_DATA,
  'Only & Sons': BESTSELLER_ONLY_AND_SONS_DATA,
  'OVS': OVS_REAL_DATA,
  'UTG': UTG_REAL_DATA
};
