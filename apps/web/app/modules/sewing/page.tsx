'use client';
// Main Sewing Operations & Line Plan Overview Hub

import React, { useState } from 'react';
import Link from 'next/link';
import Shell from '../../../components/Shell';
import { SewingLinePlanDashboard } from '../../../components/SewingLinePlanDashboard';

export default function SewingModulePage() {
  const [activeTab, setActiveTab] = useState<'line-plan' | 'gantt' | 'hourly'>('line-plan');

  return (
    <Shell
      title="Sewing Operations & Line Management"
      eyebrow="Line Plan & Shipment Follow-up, Gantt Schedules, and Line-Wise Production Tracking"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[var(--line,#e1e5ec)] pb-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('line-plan')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'line-plan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[var(--surface-subtle,#f1f5f9)] text-[var(--foreground-muted,#64748b)] hover:bg-[var(--surface,#e2e8f0)] hover:text-[var(--foreground,#0f172a)]'
              }`}
            >
              1. Line Plan & Shipment Follow-up
            </button>
            <Link
              href="/modules/sewing-planning"
              className="rounded-md bg-[var(--surface-subtle,#f1f5f9)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground-muted,#64748b)] hover:bg-[var(--surface,#e2e8f0)] hover:text-[var(--foreground,#0f172a)]"
            >
              2. Sewing Line Gantt Chart →
            </Link>
            <Link
              href="/modules/cutting"
              className="rounded-md bg-[var(--surface-subtle,#f1f5f9)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground-muted,#64748b)] hover:bg-[var(--surface,#e2e8f0)] hover:text-[var(--foreground,#0f172a)]"
            >
              3. Cutting Operations →
            </Link>
            <Link
              href="/modules/finishing"
              className="rounded-md bg-[var(--surface-subtle,#f1f5f9)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground-muted,#64748b)] hover:bg-[var(--surface,#e2e8f0)] hover:text-[var(--foreground,#0f172a)]"
            >
              4. Finishing & Packing →
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/modules/sewing/line-plan"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <span>Full Screen Plan</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'line-plan' && (
          <SewingLinePlanDashboard embedded />
        )}
      </div>
    </Shell>
  );
}
