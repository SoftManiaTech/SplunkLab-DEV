// lib/gtag.ts

export const GA_TRACKING_ID = 'G-XXXXXXXXXX' // replace with your ID

// Standard GA event
export const event = ({ action, params }: {
  action: string,
  params: Record<string, any>
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params)
  } else {
    console.warn("gtag not initialized")
  }
}
