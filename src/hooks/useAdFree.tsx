import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdFree = () => {
  const { user } = useAuth();
  const [adFreeUntil, setAdFreeUntil] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setAdFreeUntil(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("ad_free_until")
      .eq("id", user.id)
      .maybeSingle();
    const v = (data as any)?.ad_free_until;
    setAdFreeUntil(v ? new Date(v) : null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const isAdFree = !!adFreeUntil && adFreeUntil.getTime() > Date.now();

  return { isAdFree, adFreeUntil, loading, refresh: fetch };
};
