'use client';

import React from 'react';
import NosShell from '../../components/NosShell';
import NosCommandCenter from '../../components/NosCommandCenter';

export default function MerchandisingCommandCenterPage() {
  return (
    <NosShell
      title="01. Command Center"
      subtitle="Enterprise Merchandising Control Tower · Authorized Buyer Data Isolation · Live Production & Capacity Pipeline"
    >
      <NosCommandCenter />
    </NosShell>
  );
}
