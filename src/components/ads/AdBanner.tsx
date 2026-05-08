import { useEffect, useRef } from "react";
import { useAdFree } from "@/hooks/useAdFree";
import { useConsent } from "@/hooks/useConsent";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  slot: string;
  className?: string;
}

export const AdBanner = ({ slot, className = "" }: AdBannerProps) => {
  const { isAdFree, loading } = useAdFree();
  const { adsAllowed, personalizedAds } = useConsent();
  const pushed = useRef(false);

  useEffect(() => {
    if (loading || isAdFree || !adsAllowed) return;
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [loading, isAdFree, adsAllowed]);

  if (loading || isAdFree || !adsAllowed) return null;

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: "block" }}
      data-ad-client="ca-pub-9554703087221561"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-npa={personalizedAds ? undefined : "1"}
    />
  );
};
