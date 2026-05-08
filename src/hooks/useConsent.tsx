import { useEffect, useState, useCallback } from "react";

const EEA_COUNTRIES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO",
  "GB","UK","CH",
];

const EEA_TIMEZONES = [
  "Europe/", "Atlantic/Reykjavik", "Atlantic/Canary", "Atlantic/Madeira", "Atlantic/Azores",
];

export const isLikelyEEAUser = (): boolean => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (EEA_TIMEZONES.some((t) => tz.startsWith(t))) return true;
    const langs = [navigator.language, ...(navigator.languages || [])];
    for (const l of langs) {
      const region = l.split("-")[1]?.toUpperCase();
      if (region && EEA_COUNTRIES.includes(region)) return true;
    }
  } catch {
    // ignore
  }
  return false;
};

export type ConsentStatus = "accepted" | "refused" | null;

const STORAGE_KEY = "gdpr_consent";

export const useConsent = () => {
  const [status, setStatus] = useState<ConsentStatus>(null);
  const [needsBanner, setNeedsBanner] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setStatus("accepted");
    else if (stored === "false") setStatus("refused");
    else setNeedsBanner(isLikelyEEAUser());
  }, []);

  const accept = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setStatus("accepted");
    setNeedsBanner(false);
  }, []);

  const refuse = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "false");
    setStatus("refused");
    setNeedsBanner(false);
  }, []);

  // For non-EEA users, ads always allowed (personalized)
  // For EEA: accepted = personalized, refused = NPA only, null = no ads until choice
  const isEEA = isLikelyEEAUser();
  const adsAllowed = !isEEA || status !== null;
  const personalizedAds = !isEEA || status === "accepted";

  return { status, needsBanner, accept, refuse, isEEA, adsAllowed, personalizedAds };
};
