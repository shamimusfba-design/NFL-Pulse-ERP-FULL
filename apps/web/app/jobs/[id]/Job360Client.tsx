'use client';

import React from 'react';
import { Job360Content } from '../page';

export function Job360Client({ initialJobId }: { initialJobId?: string }) {
  return <Job360Content initialJobId={initialJobId} />;
}
