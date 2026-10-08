'use client';

import React from 'react';
import NosModulePlaceholder from '../../../components/NosModulePlaceholder';

export default function TimeAndActionPage() {
  return (
    <NosModulePlaceholder
      moduleNo="05"
      title="T&A / Critical Path"
      subtitle="Time & Action Schedules · Lead-time Tracking · Milestone Alerts · Bottleneck Analysis"
      icon="⏱️"
      description="Central Planning issued T&A critical path tracking, backward lead time calculations, and milestone bottleneck resolution."
      plannedFeatures={[
        'Auto-generated T&A schedule linked to buyer ex-factory date',
        'Lead time deviation alerts (Yarn, Lab Dip, Strike-off, PP Sample)',
        'Capacity-aware sewing line start date alignment',
        'Buyer approval milestone tracking with escalation triggers',
        'Export delivery variance analysis vs original contract'
      ]}
      connectedExistingRoute="/modules/ta"
      connectedExistingLabel="Time & Action Engine"
      kpis={[
        { label: 'T&A Compliance', value: '96.4%', hint: 'On-schedule critical path milestones' },
        { label: 'Milestones Due Today', value: '7', hint: 'Sample & lab approvals' },
        { label: 'Overdue Milestones', value: '2', hint: 'Shade approvals requiring escalation' }
      ]}
    />
  );
}
