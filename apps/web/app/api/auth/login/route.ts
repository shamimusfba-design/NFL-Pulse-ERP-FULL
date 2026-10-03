import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email || 'admin@nfl.local';
    const user = {
      id: 'u-admin-1',
      email,
      name: email.split('@')[0] === 'admin' ? 'NFL Administrator' : 'Authorized User',
      roles: ['ADMIN']
    };
    return NextResponse.json({
      success: true,
      accessToken: 'demo-access-token-' + Date.now(),
      refreshToken: 'demo-refresh-token-' + Date.now(),
      user
    });
  } catch {
    return NextResponse.json({
      success: true,
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      user: { id: 'u-1', email: 'admin@nfl.local', name: 'NFL Administrator', roles: ['ADMIN'] }
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Auth login endpoint ready'
  });
}
