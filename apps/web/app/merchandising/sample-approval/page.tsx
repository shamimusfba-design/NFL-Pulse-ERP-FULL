'use client';

import React from 'react';
import NosModulePlaceholder from '../../../components/NosModulePlaceholder';

export default function SampleApprovalManagementPage() {
  return (
    <NosModulePlaceholder
      moduleNo="07"
      title="Sample & Approval Management"
      subtitle="Proto Samples · Fit Approval · PP Sample Gates · Lab Dip Strikes"
      icon="✨"
      description="Sample department coordination, buyer fit comments, PP sample approval gatekeeping, and lab dip shade matching."
      plannedFeatures={[
        'Proto, Fit, SMS, and Pre-Production (PP) sample stage tracking',
        'Buyer comment repository with measurement correction log',
        'PP sample sign-off gatekeeper before bulk cutting release',
        'Lab dip 3-stage color matching and spectrometer delta-E validation',
        'AOP & rotary print strike-off approvals with outsourced vendor links'
      ]}
      connectedExistingRoute="/modules/lab"
      connectedExistingLabel="Lab & Testing Engine"
      kpis={[
        { label: 'PP Samples Active', value: '46', hint: 'Currently in sample sewing room' },
        { label: 'Approval Rate', value: '92.8%', hint: 'First-time right fit approvals' },
        { label: 'Shade Cards Passed', value: '184', hint: 'Buyer approved lab dip strikes' }
      ]}
    />
  );
}
