declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
export const GA_TRACKING_ID = 'G-MR54RYZW34'; // ✅ your current GA4 ID
export const event = ({
  action,
  params,
}: {
  action: string;
  params: Record<string, any>;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  } else {
    console.warn('gtag not initialized');
  }
};
