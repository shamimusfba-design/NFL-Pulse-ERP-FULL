'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import TimeAndActionWorkspace from '../../../components/TimeAndActionWorkspace';

export default function TimeAndActionPage() {
  return (
    <NosShell
      title="05. T&A / Critical Path"
      subtitle="Time & Action Schedules · Lead-time Tracking · Milestone Alerts · Bottleneck Analysis"
    >
      <TimeAndActionWorkspace />
    </NosShell>
  );
}
