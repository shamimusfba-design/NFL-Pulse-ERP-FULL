'use client';

import React from 'react';
import NosShell from '../../../components/NosShell';
import StyleManagementWorkspace from '../../../components/StyleManagementWorkspace';

export default function StyleProductManagementPage() {
  return (
    <NosShell
      title="03. Style & Product Management"
      subtitle="Master Style Repository · Tech Packs · Color × Size Ratio Matrix · Spec Grading"
    >
      <StyleManagementWorkspace />
    </NosShell>
  );
}

