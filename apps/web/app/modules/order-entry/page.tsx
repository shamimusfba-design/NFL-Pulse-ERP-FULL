'use client';

import React from 'react';
import Shell from '../../../components/Shell';
import OrderEntryWorkspace from '../../../components/OrderEntryWorkspace';

export default function OrderEntryModulePage() {
  return (
    <Shell
      title="Order Entry & Buyer PO / Market Import"
      eyebrow="NOS Merchandising · Order & PO Management"
    >
      <div style={{ padding: '0 4px' }}>
        <OrderEntryWorkspace />
      </div>
    </Shell>
  );
}
