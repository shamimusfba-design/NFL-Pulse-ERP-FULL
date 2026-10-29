'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import ShipmentClosingWorkspace from '../../../components/ShipmentClosingWorkspace';

export default function ShipmentOrderClosingPage() {
  return (
    <NosShell
      title="09. Shipment & Order Closing"
      subtitle="Ex-Factory Schedule · Cargo Staging · Packing Lists · Commercial Handover"
    >
      <ShipmentClosingWorkspace />
    </NosShell>
  );
}
