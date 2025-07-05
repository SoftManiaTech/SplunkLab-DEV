export const GA_TRACKING_ID = "G-WHVVB84Z78";

// Call this to fire custom events
export const event = ({
  action,
  params,
}: {
  action: string;
  params: { [key: string]: any };
}) => {
  if (typeof window !== "undefined") {
    window.gtag("event", action, params);
  }
};
