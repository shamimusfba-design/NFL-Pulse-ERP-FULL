'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import PreOrderCostingWorkspace from '../../../components/PreOrderCostingWorkspace';

export default function PreOrderCostingPage() {
  return (
    <NosShell
      title="01. Pre-Order / Costing"
      subtitle="Salesman Sample Quotations · Real Garment Cost Sheet · Fabric Consumption & Processing Matrices"
    >
      <PreOrderCostingWorkspace />
    </NosShell>
  );
}
