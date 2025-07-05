// app/api/log/route.ts

import { NextRequest, NextResponse } from "next/server";
import { logToSplunk } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ip = "unknown",
      session = "no-session",
      event = "no-event",
      browser = req.headers.get("user-agent") || "unknown",
    } = body;

    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });

    const result = await logToSplunk({
      ip,
      session,
      event,
      browser,
      timestamp,
    });

    return NextResponse.json({ status: "success", result });
  } catch (err: any) {
    console.error("API Error in /api/log:", err);
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}
