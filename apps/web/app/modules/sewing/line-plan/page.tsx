'use client';
// Dedicated route for Line Plan & Shipment Follow-up

import React from 'react';
import Shell from '../../../../components/Shell';
import { SewingLinePlanDashboard } from '../../../../components/SewingLinePlanDashboard';

export default function SewingLinePlanPage() {
  return (
    <Shell
      title="Line Plan & Shipment Follow-up"
      eyebrow="Real-time Sewing Line Execution, Cutting Gate Input Tracking, & Shipment Delivery"
    >
      <SewingLinePlanDashboard />
    </Shell>
  );
}
