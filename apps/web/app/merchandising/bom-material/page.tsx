'use client';

import React, { Suspense } from 'react';
import NosShell from '../../../components/NosShell';
import BomMaterialWorkspace from '../../../components/BomMaterialWorkspace';

export default function BomMaterialFollowUpPage() {
  return (
    <NosShell
      title="05. BOM & Material Follow-up"
      subtitle="Bill of Materials · Yarn Requisition · Greige Fabric Orders · Trims Bookings"
    >
      <Suspense fallback={<div style={{ padding: '24px', color: '#64748b' }}>Loading BOM &amp; Material workspace...</div>}>
        <BomMaterialWorkspace />
      </Suspense>
    </NosShell>
  );
}
