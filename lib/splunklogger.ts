// Splunk logging utility
interface SplunkLogData {
  session: string
  action: string
  details: Record<string, any>
}

export const logToSplunk = async (data: SplunkLogData): Promise<void> => {
  try {
    // If no Splunk configuration is available, just log to console in development
    if (!process.env.SPLUNK_HEC_URL || !process.env.SPLUNK_TOKEN) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Splunk Log]", data)
      }
      return
    }

    const response = await fetch(process.env.SPLUNK_HEC_URL, {
      method: "POST",
      headers: {
        Authorization: `Splunk ${process.env.SPLUNK_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: {
          timestamp: new Date().toISOString(),
          ...data,
        },
        sourcetype: "lab_manager",
        source: "web_app",
      }),
    })

    if (!response.ok) {
      console.error("Failed to send log to Splunk:", response.statusText)
    }
  } catch (error) {
    console.error("Error sending log to Splunk:", error)
  }
}
