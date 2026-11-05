'use client';

import React from 'react';
import Shell from '../../components/Shell';
import BulkMerchandisingDashboard from '../../components/BulkMerchandisingDashboard';

export default function BulkMerchandisingPage() {
  return (
    <Shell title="Bulk Merchandising" eyebrow="Merchandising · Bulk Operations">
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        <BulkMerchandisingDashboard />
      </div>
    </Shell>
  );
}
