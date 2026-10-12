'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import ProductionFollowUpWorkspace from '../../../components/ProductionFollowUpWorkspace';

export default function ProductionFollowUpPage() {
  return (
    <NosShell
      title="08. Production Follow-up"
      subtitle="Floor WIP · Daily Output vs Target · Line Balancing · Sewing Balances"
    >
      <ProductionFollowUpWorkspace />
    </NosShell>
  );
}
