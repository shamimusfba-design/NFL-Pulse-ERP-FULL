'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import OrderEntryWorkspace from '../../../components/OrderEntryWorkspace';

export default function OrderPoManagementPage() {
  return (
    <NosShell
      title="Order & PO Management"
      subtitle="Purchase Orders · Contract Revisions · Delivery Split & Country Breakdowns"
    >
      <OrderEntryWorkspace />
    </NosShell>
  );
}
