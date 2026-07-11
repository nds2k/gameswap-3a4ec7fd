import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'moderator' | 'user';

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setIsAdmin(false);
        setIsModerator(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles([]);
        } else {
          const userRoles = data?.map(r => r.role as AppRole) || [];
          setRoles(userRoles);
          setIsAdmin(userRoles.includes('admin'));
          setIsModerator(userRoles.includes('moderator') || userRoles.includes('admin'));
        }
      } catch (err) {
        console.error('Error in useUserRole:', err);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  return { roles, isAdmin, isModerator, isLoading };
};
