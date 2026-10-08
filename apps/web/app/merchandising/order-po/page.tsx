'use client';

import React from 'react';
import NosModulePlaceholder from '../../../components/NosModulePlaceholder';

export default function OrderPoManagementPage() {
  return (
    <NosModulePlaceholder
      moduleNo="02"
      title="Order & PO Management"
      subtitle="Purchase Orders · Contract Revisions · Delivery Split & Country Breakdowns"
      icon="📦"
      description="Central intake, parsing, revision tracking, and production lot issuance for all buyer PO contracts across NFL & NCL."
      plannedFeatures={[
        'Automated Excel & EDI PO Import with schema verification',
        'Multi-country dispatch allocation (Germany, France, UK, Spain, Italy)',
        'Ratio Pack & Flat Solid Pack breakdown configuration',
        'Quantity revisions with reason tracking & history log',
        'OVS Market Production Lot creation and reservation'
      ]}
      connectedExistingRoute="/orders/new"
      connectedExistingLabel="Order Entry / PO Import Engine"
      kpis={[
        { label: 'Active POs', value: '428', hint: 'Contracted buyer purchase orders' },
        { label: 'Pending Revisions', value: '3', hint: 'Awaiting buyer confirmation' },
        { label: 'Country Lots', value: '1,240', hint: 'Allocated shipment lots' }
      ]}
    />
  );
}
