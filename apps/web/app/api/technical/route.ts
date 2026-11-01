import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface TechnicalState {
  st: Record<string, { s?: string; need?: boolean | null; note?: string; [key: string]: any }>;
  log: Array<{ jk: string; from: string; to: string; d: string; by: string; note?: string; [key: string]: any }>;
  qc: Array<{ jk: string; res: string; f: string; d: string; by: string }>;
  pp: Record<string, { d: string; t?: string; by?: string }>;
  demoSeeded?: boolean;
  lastUpdated?: string;
}

const stateFilePath = path.join(process.cwd(), 'apps', 'web', 'data', 'technical-state.json');

// Memory store initialized from file if present
let memoryState: TechnicalState = {
  st: {},
  log: [],
  qc: [],
  pp: {},
  demoSeeded: true,
  lastUpdated: new Date().toISOString(),
};

try {
  if (fs.existsSync(stateFilePath)) {
    const raw = fs.readFileSync(stateFilePath, 'utf8');
    memoryState = { ...memoryState, ...JSON.parse(raw) };
  }
} catch (e) {
  console.warn('[Technical API] Using memory store, could not read technical-state.json:', e);
}

function persistState() {
  try {
    const dir = path.dirname(stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(stateFilePath, JSON.stringify(memoryState, null, 2), 'utf8');
  } catch (e) {
    // Graceful fallback in environments with read-only filesystems
    console.warn('[Technical API] Failed to write technical-state.json to disk:', e);
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    state: memoryState,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'sync_state' && body.state) {
      memoryState = {
        ...memoryState,
        ...body.state,
        st: { ...(memoryState.st || {}), ...(body.state.st || {}) },
        pp: { ...(memoryState.pp || {}), ...(body.state.pp || {}) },
        log: Array.isArray(body.state.log) ? body.state.log : memoryState.log,
        qc: Array.isArray(body.state.qc) ? body.state.qc : memoryState.qc,
        lastUpdated: new Date().toISOString(),
      };
      persistState();
      return NextResponse.json({ success: true, state: memoryState });
    }

    if (body.action === 'move' && body.jk && body.to) {
      const from = memoryState.st[body.jk]?.s || 'Unknown';
      memoryState.st[body.jk] = {
        ...(memoryState.st[body.jk] || {}),
        s: body.to,
        ...(body.extra || {}),
      };
      memoryState.log.push({
        jk: body.jk,
        from,
        to: body.to,
        d: new Date().toISOString().slice(0, 10),
        by: body.by || 'ERP User',
        ...(body.extra || {}),
      });
      memoryState.lastUpdated = new Date().toISOString();
      persistState();
      return NextResponse.json({ success: true, state: memoryState });
    }

    if (body.action === 'qc' && body.qc) {
      memoryState.qc.push(body.qc);
      memoryState.lastUpdated = new Date().toISOString();
      persistState();
      return NextResponse.json({ success: true, state: memoryState });
    }

    if (body.action === 'pp' && body.jk && body.pp) {
      memoryState.pp[body.jk] = body.pp;
      memoryState.lastUpdated = new Date().toISOString();
      persistState();
      return NextResponse.json({ success: true, state: memoryState });
    }

    // Default: merge generic body state
    if (body.state) {
      memoryState = { ...memoryState, ...body.state, lastUpdated: new Date().toISOString() };
      persistState();
      return NextResponse.json({ success: true, state: memoryState });
    }

    return NextResponse.json({ success: true, state: memoryState });
  } catch (error: any) {
    console.error('[Technical API POST error]:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
