import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SellerStatus {
  hasAccount: boolean;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export const useSellerStatus = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SellerStatus | null>(null);

  const checkStatus = useCallback(async (): Promise<SellerStatus> => {
    if (!user) throw new Error("Non authentifié");

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-seller-status");
      if (error) throw new Error(error.message);

      const result: SellerStatus = {
        hasAccount: data?.hasAccount ?? false,
        onboardingComplete: data?.onboardingComplete ?? false,
        chargesEnabled: data?.chargesEnabled ?? false,
        payoutsEnabled: data?.payoutsEnabled ?? false,
      };

      setStatus(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isFullyOnboarded = status?.hasAccount && status?.onboardingComplete && status?.chargesEnabled;

  return { checkStatus, status, loading, isFullyOnboarded };
};
