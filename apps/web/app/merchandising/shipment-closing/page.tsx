'use client';

import React from 'react';
import NosModulePlaceholder from '../../../components/NosModulePlaceholder';

export default function ShipmentOrderClosingPage() {
  return (
    <NosModulePlaceholder
      moduleNo="09"
      title="Shipment & Order Closing"
      subtitle="Ex-Factory Inspections · Commercial Invoices · Packing Lists · Order Reconciliation"
      icon="🚢"
      description="Final inspection sign-offs, forwarding agent CFS booking, export documentation, and commercial order closing reconciliation."
      plannedFeatures={[
        'Final QA inspection booking (AQL 1.5/2.5) with third-party buyers',
        'Forwarder cargo handover and container stuffing challan',
        'Automated Packing List & Commercial Invoice generation',
        'Short-shipment and over-shipment reconciliation',
        'Post-shipment performance scorecards & customer audit log'
      ]}
      connectedExistingRoute="/merchandising"
      connectedExistingLabel="Shipment Register & Follow-up"
      kpis={[
        { label: 'Ex-Factory This Week', value: '18,400 pcs', hint: 'Across 3 confirmed job lots' },
        { label: 'AQL Inspection Pass', value: '98.5%', hint: 'Final QA first-time pass rate' },
        { label: 'Shipped This Month', value: '284k pcs', hint: 'Completed export dispatches' }
      ]}
    />
  );
}
