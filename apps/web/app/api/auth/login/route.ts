import { NextRequest, NextResponse } from 'next/server';

const NEST_API_URL = (process.env.NEST_API_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(`${NEST_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email,
        password: body.password || 'ChangeMe123!'
      }),
      cache: 'no-store'
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || 'Invalid email or password' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user
    });
  } catch (err) {
    return NextResponse.json(
      { message: 'The ERP server (API) is not reachable on port 4000. Start the API and try again.' },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Auth login endpoint ready'
  });
}
