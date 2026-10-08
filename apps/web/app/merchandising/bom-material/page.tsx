'use client';

import React from 'react';
import NosModulePlaceholder from '../../../components/NosModulePlaceholder';

export default function BomMaterialFollowUpPage() {
  return (
    <NosModulePlaceholder
      moduleNo="06"
      title="BOM & Material Follow-up"
      subtitle="Bill of Materials · Yarn Requisition · Greige Fabric Orders · Trims Bookings"
      icon="🧵"
      description="Material requirement planning, spinning mill allocations, bulk fabric order sheets, and trims booking approvals."
      plannedFeatures={[
        'Full garment Bill of Materials (BOM) specification ledger',
        'Bulk Fabric Order Sheet issuance linked to CAD marker consumption',
        'Yarn requisition linking spinning mills (Badsha, Square, Maksons, Akij)',
        'Trims & accessories inventory tracking and customs clearance follow-up',
        'Greige fabric aging, 4-point inspection, and dyeing winch scheduling'
      ]}
      connectedExistingRoute="/modules/yarn"
      connectedExistingLabel="Yarn Management & Material Engine"
      kpis={[
        { label: 'Yarn In-House', value: '94.2%', hint: 'Allocated yarn buffer in warehouse' },
        { label: 'Fabric Requisitions', value: '428', hint: 'Issued bulk fabric orders' },
        { label: 'Trims Complete', value: '88.5%', hint: 'Approved accessory packages' }
      ]}
    />
  );
}
