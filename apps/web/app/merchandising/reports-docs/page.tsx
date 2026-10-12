'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import ReportsDocsWorkspace from '../../../components/ReportsDocsWorkspace';

export default function ReportsDocsPage() {
  return (
    <NosShell
      title="10. Reports, Documents & Communication"
      subtitle="Tech Packs · Buyer PO Contracts · Fabric Bookings · Certified Lab Reports · Export Forms"
    >
      <ReportsDocsWorkspace />
    </NosShell>
  );
}
