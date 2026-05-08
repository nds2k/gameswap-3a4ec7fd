import { useEffect, useRef } from "react";
import { useAdFree } from "@/hooks/useAdFree";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const pushed = useRef(false);

  useEffect(() => {
    if (loading || isAdFree) return;
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [loading, isAdFree]);

  if (loading || isAdFree) return null;

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
    />
  );
};
