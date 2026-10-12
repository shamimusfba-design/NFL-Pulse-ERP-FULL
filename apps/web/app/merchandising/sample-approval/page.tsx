'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import SampleApprovalWorkspace from '../../../components/SampleApprovalWorkspace';

export default function SampleApprovalManagementPage() {
  return (
    <NosShell
      title="07. Sample & Approval Management"
      subtitle="Proto Samples · Fit Approval · PP Sample Gates · Lab Dip Strikes"
    >
      <SampleApprovalWorkspace />
    </NosShell>
  );
}
