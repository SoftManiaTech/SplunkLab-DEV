import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXT_PUBLIC_BACKEND_URL}`; // or your deployed URL


    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.id_token) {
      return NextResponse.json({ error: 'Failed to get id_token', detail: tokenData }, { status: 500 });
    }

    const idToken = tokenData.id_token;
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(base64, 'base64').toString());

    const email = decoded.email;
    const name = decoded.name;

    return NextResponse.json({ email, name });
  } catch (error: any) {
    return NextResponse.json({ error: 'OAuth exchange failed', debug: error.message }, { status: 500 });
  }
}
