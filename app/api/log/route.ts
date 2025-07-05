import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const payload = {
      event: {
        ip: body.ip || "unknown",
        session: body.session || "no-session",
        event: body.event || "no-event",
        browser: body.browser || "no-browser",
      },
      time: Math.floor(Date.now() / 1000),
      sourcetype: "_json",
    }

    const response = await fetch("http://prod-splunk.softmania.in:8000/services/collector", {
      method: "POST",
      headers: {
        "Authorization": "Splunk c696212a-862b-4ecf-b5ef-82b331210b48",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    return new NextResponse("Logged to Splunk", { status: response.ok ? 200 : 500 })
  } catch (err) {
    console.error("Splunk log error:", err)
    return new NextResponse("Logging failed", { status: 500 })
  }
}
