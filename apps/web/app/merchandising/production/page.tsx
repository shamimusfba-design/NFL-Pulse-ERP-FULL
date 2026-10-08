'use client';

import React from 'react';
import NosModulePlaceholder from '../../../components/NosModulePlaceholder';

export default function ProductionFollowUpPage() {
  return (
    <NosModulePlaceholder
      moduleNo="08"
      title="Production Follow-up"
      subtitle="Floor WIP · Daily Output vs Target · Line Balancing · Sewing Balances"
      icon="🏭"
      description="Merchandiser oversight of actual factory production across Cutting, Sewing, and Finishing in NFL Unit 1 & NCL Unit 2."
      plannedFeatures={[
        'Cutting release and daily bundle ticket execution',
        'Sewing input vs hourly output tracking against IE target',
        'Line balancing alerts for short-shipment mitigation',
        'Outsource print & embroidery challan dispatch and return reconcile',
        'Finishing, pressing, poly packing and carton staging updates'
      ]}
      connectedExistingRoute="/modules/production-lots"
      connectedExistingLabel="Production Lots & Line Allocation"
      kpis={[
        { label: 'Lines Running', value: '28 Lines', hint: 'NFL Unit 1 & NCL Unit 2 lines' },
        { label: 'Daily Output', value: '42,500 pcs', hint: 'Yesterday sewing output' },
        { label: 'IE Efficiency', value: '64.2%', hint: 'Overall line efficiency rating' }
      ]}
    />
  );
}
