'use client';

import React from 'react';
import NosModulePlaceholder from '../../../components/NosModulePlaceholder';

export default function CostingCommercialPage() {
  return (
    <NosModulePlaceholder
      moduleNo="04"
      title="Costing & Commercial"
      subtitle="Pre-costing · Yarn & Fabric Consumption · FOB Quotations · Profit Margins"
      icon="💵"
      description="Pre-costing analysis, yarn requirement calculations, processing surcharges, trims costing, and buyer price negotiations."
      plannedFeatures={[
        'Interactive pre-costing breakdown sheet with margin targets',
        'Yarn count, composition and spinning cost calculator',
        'Knitting, dyeing, all-over-print and wash cost matrices',
        'Trims & accessory BOM costing per dozen/piece',
        'CM (Cost of Making) optimization based on IE SMV benchmarks'
      ]}
      connectedExistingRoute="/merchandising"
      connectedExistingLabel="Merchandising Commercial Register"
      kpis={[
        { label: 'Avg FOB Price', value: '$4.85', hint: 'Contracted unit price across active styles' },
        { label: 'CM Budget', value: '$1.12', hint: 'Avg manufacturing cost per pc' },
        { label: 'Gross Margin', value: '18.4%', hint: 'Target factory profitability' }
      ]}
    />
  );
}
