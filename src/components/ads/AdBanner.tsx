import { useEffect, useRef } from "react";
import { useAdFree } from "@/hooks/useAdFree";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConsent } from "@/hooks/useConsent";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdBannerProps {
  slot: string;
  format?: string;
  variant?: "sidebar" | "mobile" | "auto";
  className?: string;
}

export const AdBanner = ({ slot, format = "auto", variant = "auto", className = "" }: AdBannerProps) => {
  const { isAdFree, loading } = useAdFree();
  const isMobile = useIsMobile();
  const { adsAllowed, personalizedAds } = useConsent();
  const pushed = useRef(false);

  useEffect(() => {
    if (loading || isAdFree || !adsAllowed) return;
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push(
        personalizedAds ? {} : { params: { npa: "1" } }
      );
      pushed.current = true;
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [loading, isAdFree, adsAllowed, personalizedAds]);

  if (loading || isAdFree || !adsAllowed) return null;

  const useMobileSize = variant === "mobile" || (variant === "auto" && isMobile);
  const useSidebarSize = variant === "sidebar";

  const style: React.CSSProperties = useSidebarSize
    ? { display: "inline-block", width: 160, height: 600 }
    : useMobileSize
    ? { display: "inline-block", width: 320, height: 100 }
    : { display: "block" };

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={style}
      data-ad-client="ca-pub-9554703087221561"
      data-ad-slot={slot}
      data-ad-format={useSidebarSize || useMobileSize ? undefined : format}
      data-full-width-responsive={useSidebarSize || useMobileSize ? undefined : "true"}
      data-npa={personalizedAds ? undefined : "1"}
    />
  );
};
