'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import BulkMerchandisingDashboard from '../../../components/BulkMerchandisingDashboard';

export default function BulkMerchandisingDashboardPage() {
  return (
    <NosShell
      title="Bulk Merchandising Dashboard"
      subtitle="Operational Control Center · Authorized Buyer Data Isolation · Live Production & Exceptions"
    >
      <BulkMerchandisingDashboard />
    </NosShell>
  );
}
