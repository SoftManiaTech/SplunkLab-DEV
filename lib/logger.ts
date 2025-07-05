// lib/logger.ts

export async function logToSplunk({
  ip,
  session,
  event,
  browser,
  timestamp,
}: {
  ip: string;
  session: string;
  event: string;
  browser: string;
  timestamp: string;
}) {
  const SPLUNK_HEC_URL = process.env.SPLUNK_HEC_URL!;
  const SPLUNK_HEC_TOKEN = process.env.SPLUNK_HEC_TOKEN!;

  const payload = {
    time: Math.floor(Date.now() / 1000),
    host: ip,
    source: "vercel-app",
    sourcetype: "_json",
    event: {
      timestamp,
      ip,
      session,
      event,
      browser,
    },
  };

  try {
    const res = await fetch(SPLUNK_HEC_URL, {
      method: "POST",
      headers: {
        Authorization: `Splunk ${SPLUNK_HEC_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await res.text();
  } catch (error) {
    console.error("Failed to send log to Splunk:", error);
    return null;
  }
}
