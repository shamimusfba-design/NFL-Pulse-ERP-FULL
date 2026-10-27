'use client';

import Shell from '../../../components/Shell';

// Sample Room module (prototype UI).
// The full screen lives in /public/sample-room/index.html so the sample team can review it
// before it is moved to React + NestJS. See docs/SAMPLE_ROOM_MODULE.md.
export default function SampleRoomPage() {
  return (
    <Shell title="Sample Room" eyebrow="Sample follow-up and new sample entry · prototype">
      <iframe
        src="/sample-room/index.html"
        title="Sample Room"
        style={{ width: '100%', height: 'calc(100vh - 140px)', border: '1px solid var(--line, #e1e5ec)', borderRadius: 12, background: '#fff' }}
      />
    </Shell>
  );
}
