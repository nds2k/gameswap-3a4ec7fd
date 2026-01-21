import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

export const useRequireAuth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const requireAuth = useCallback(
    (callback?: () => void) => {
      if (!user) {
        navigate("/auth");
        return false;
      }
      if (callback) {
        callback();
      }
      return true;
    },
    [user, navigate]
  );

  return { user, isAuthenticated: !!user, requireAuth };
};
