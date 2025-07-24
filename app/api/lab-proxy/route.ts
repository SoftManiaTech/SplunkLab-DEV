// File: app/api/lab-proxy/route.ts

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ACTIONS = [
  "start",
  "stop",
  "reboot",
  "instances",
  "check-user-lab",
  "usage-summary",
  "get-user-keys",
];
const BACKEND = process.env.NEXT_PUBLIC_API_URL!;


export async function POST(req: NextRequest) {
  try {
    const { action, payload } = await req.json();
    const email = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 403 });
    }

    const res = await fetch(`${BACKEND}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${email}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
